const _ = require('lodash');
const cron = require('node-cron');
var Connection = require('./connection');
var Inventory = require('./inventory');
var Inventory34 = require('./inventory34');
var Inventory35 = require('./inventory35');
var logger = require("../config/logger.config");
var APModel = require('../models/AccessPointModel');
var ClusterModel = require('../models/ClusterModel');
var UserModel = require('../models/UserModel');
var aputils = require('../utils/aputils');
var CommonService = require('../routes/common.service');

// setup the scheduled inventory task, called at the server startup time
exports.startAll = async() => {
  try {
	  logger.info('Initializing scheduled inventory task')
	  Connection.connections = {}
	  let schedulerFreq = await UserModel.findOne({username : 'admin'}, {backprocesssettings : 1});
	  let cronSetting = schedulerFreq.backprocesssettings ? schedulerFreq.backprocesssettings : ''
	  let cronFrequency = cronSetting.frequency ? cronSetting.frequency : '*/15 * * * *'
	  let isCronEnabled = cronSetting.enabled ? true : false
	  task = cron.schedule(cronFrequency, this.scheduleTaskCallback.bind(this, null))
	  if(isCronEnabled){
		task.start()
		logger.info('Inventory task scheduled as '+cronFrequency+'')  
	  }else{
		logger.info('Inventory task is currently disabled')   
	  }
	  //check in every 5 minutes if there is any changes in the back process schedule, if change found then re-schedule the back process
	  var minutes = 5, the_interval = minutes * 60 * 1000;
	  setInterval(async() => {
		  let schedulerSetting = await UserModel.findOne({username : 'admin'}, {backprocesssettings : 1, logsconfig : 1});
		  let backprocesssetting = schedulerSetting.backprocesssettings ? schedulerSetting.backprocesssettings : ''
		  if(backprocesssetting && backprocesssetting.changed){
			let schedulefrequency = backprocesssetting.frequency
			let isEnabled = backprocesssetting.enabled
			let backProcessSettingsVal = {"changed" : false, "enabled" : isEnabled, "frequency" : schedulefrequency}
			await UserModel.findOneAndUpdate({ username: 'admin' }, { backprocesssettings : backProcessSettingsVal });
			if(!isEnabled){
				task.stop()
				logger.info('Inventory config sync task process is disabled by system administrator')
			}else{
				task.stop()
				task = cron.schedule(schedulefrequency, this.scheduleTaskCallback.bind(this, null))
				task.start()
				logger.info('Inventory config sync task re-scheduled as '+schedulefrequency+'')
			}
		  }
		  let logsconfig = schedulerSetting.logsconfig ? schedulerSetting.logsconfig : ''
		  if(logsconfig && logsconfig.changed){
				let fileLogsLevel = logsconfig.severity ? logsconfig.severity : ''
				let maxFileSize = logsconfig.filesize ? logsconfig.filesize : ''
				let maxNumberOfFiles = logsconfig.maxfiles ? logsconfig.maxfiles : ''
				
				if(fileLogsLevel){
					logger.transports['file'].level = fileLogsLevel	
				}
				if(maxFileSize){
					let fileSizeInBytes = maxFileSize*1000000 // (1MB -> 1000000)
					logger.transports['file'].maxsize = fileSizeInBytes	
				}
				if(maxNumberOfFiles){
					logger.transports['file'].maxFiles = maxNumberOfFiles	
				}
				logsconfig.changed = false
				let logSettings = logsconfig
				await UserModel.findOneAndUpdate({ username: 'admin' }, { logsconfig : logSettings });
				logger.info("Application logs settings updated for back process successfully")
		  }
	  }, the_interval); 
  } catch(err) {
    logger.info('Initialization of scheduled inventory task failed with error')
    logger.error(err)
  }  
}

// the callback function for the schedule task
exports.scheduleTaskCallback = async(onCompleteCallback) => {
  logger.info('Inventory task started by scheudler at ' + new Date())
  var view = this;
  let controllers = null
  var sourceip = aputils.getClientIp();
  var action = "Config Sync"
  var resource = "Back Process"
  var username = 'System'
  var description = ""
  const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
  try {
    controllers = await ClusterModel.find({});
    Connection.connections = {}
    logger.info('(%s) wireless controller systems found', controllers.length)
    const overallProgressTracker = {
      pendingTaskCount: controllers.length,
      completeTaskCount: 0,
      successTaskCount: 0
    }
    _.forEach(controllers, async (controller) => {
      let conn = Connection.findConnection(controller.id)
      if (!conn) {
        // connection was not found due to MoM server restart, need to initialize the connection with all information
        const connectIp = controller.ip ? controller.ip : controller.managementips
        conn = new Connection(controller.id, connectIp, controller.loginid, controller.password)
        Connection.register(conn)

        // the available IPs
        let availableIps = null
        try {
          //availableIps = await cpModel.findCpManagementIpByClusterId(controller.id)
          availableIps = controller.managementips
          logger.info('update the list of management ip (%j) for controller (%s)', availableIps, controller.name)
          conn.updateAvailableIps(availableIps)
        } catch (err) {
          logger.error('failed to retrieve the list of management ip for controller (%s)', controller.name)
          logger.error(err)
        }
      }
	  logger.info('inventory task started for controller cluster (%s)', controller.name)
	  try {
		await conn.getValidateSessionAsync()
		if (conn.is35orLater()) {
			var inventoryObj = new Inventory35(conn, controller.name, false, overallProgressTracker, onCompleteCallback)
	    }else{
			var inventoryObj = new Inventory34(conn, controller.name, false, overallProgressTracker, onCompleteCallback)  
	    }
		logger.info('Getting Inventory data of controller (%s)', controller.name)
		let inventoryStats = await inventoryObj._getSmartZoneData()
		let zonesummary = inventoryStats.zoneinventory ? inventoryStats.zoneinventory.zonesummary : []
		let cplist = inventoryStats.cplist ? inventoryStats.cplist : []
		let dplist = inventoryStats.dplist ? inventoryStats.dplist : []
		//get zones list to update in cds cluster
		//check if there is any diff between cds cluster zone list & cluster zone inventory zone list
		let configDiffFound = false
		let zoneCdsExists = controller.zones
		let zonesCds = [];
		_.forEach(zonesummary, async (clusterZoneInfo) => {
			const thisZone = {
				id: clusterZoneInfo.zoneId,
				name: clusterZoneInfo.zoneName
			}
			zonesCds.push(thisZone)
		})
		let zoneArrDiff = _.xorWith(zoneCdsExists, zonesCds, _.isEqual);
		if(zoneArrDiff && zoneArrDiff.length){
			configDiffFound = true
		}
		//get control & management Ips list to update in cds cluster 
		//check if there is any diff found in cluster control planes
		//if there is change in the cp list it means diff found other wise check for other params (except - diskUsed, diskTotal, uptimeInSecs, status & cpId)
		let CheckVszCpArr = [];
		let controlIpsCds = [];
		let managementIpsCds = [];
		_.forEach(cplist, async (clusterControlInfo) => {
			const thisVszCp = {
				managementIpv6: clusterControlInfo.managementIpv6,
				controlIpv6: clusterControlInfo.controlIpv6,
				controlIp: clusterControlInfo.controlIp,
				managementIp: clusterControlInfo.managementIp,
				role: clusterControlInfo.role,
				name: clusterControlInfo.name,
				version: clusterControlInfo.version,
				serialNumber: clusterControlInfo.serialNumber,
				mac: clusterControlInfo.mac,
				model: clusterControlInfo.model
			}
			CheckVszCpArr.push(thisVszCp)
			if(clusterControlInfo.controlIp){
				controlIpsCds.push(clusterControlInfo.controlIp)	
			}
			if(clusterControlInfo.controlIpv6){
				controlIpsCds.push(clusterControlInfo.controlIpv6)	
			}
			if(clusterControlInfo.managementIp){
				managementIpsCds.push(clusterControlInfo.managementIp)
			}
			if(clusterControlInfo.managementIpv6){
				managementIpsCds.push(clusterControlInfo.managementIpv6)
			}
		})
		let cdsCpList = controller.stats ? (controller.stats.cplist ? controller.stats.cplist : []) : []
		let CheckCdsCpArr = []
		_.forEach(cdsCpList, async (cdsControlInfo) => {
			const thisCdsCp = {
				managementIpv6: cdsControlInfo.managementIpv6,
				controlIpv6: cdsControlInfo.controlIpv6,
				controlIp: cdsControlInfo.controlIp,
				managementIp: cdsControlInfo.managementIp,
				role: cdsControlInfo.role,
				name: cdsControlInfo.name,
				version: cdsControlInfo.version,
				serialNumber: cdsControlInfo.serialNumber,
				mac: cdsControlInfo.mac,
				model: cdsControlInfo.model
			}
			CheckCdsCpArr.push(thisCdsCp)
		})
		let cpArrDiff = _.xorWith(CheckCdsCpArr, CheckVszCpArr, _.isEqual);
		if(cpArrDiff && cpArrDiff.length){
			configDiffFound = true
		}
		//check if there is any diff found in cluster data planes
		//if there is change in the dp list it means diff found other wise check for other params (except - uptime & status)
		let CheckVszDpArr = [];
		_.forEach(dplist, async (clusterDpInfo) => {
			const thisVszDp = {
				ip: clusterDpInfo.ip,
				cpName: clusterDpInfo.cpName,
				name: clusterDpInfo.name,
				version: clusterDpInfo.version,
				serialNumber: clusterDpInfo.serialNumber,
				model: clusterDpInfo.model,
				mac: clusterDpInfo.mac
			}
			CheckVszDpArr.push(thisVszDp)
		})
		let cdsDpList = controller.stats ? (controller.stats.dplist ? controller.stats.dplist : []) : []
		let CheckCdsDpArr = []
		_.forEach(cdsDpList, async (cdsDpInfo) => {
			const thisCdsDp = {
				ip: cdsDpInfo.ip,
				cpName: cdsDpInfo.cpName,
				name: cdsDpInfo.name,
				version: cdsDpInfo.version,
				serialNumber: cdsDpInfo.serialNumber,
				model: cdsDpInfo.model,
				mac: cdsDpInfo.mac
			}
			CheckCdsDpArr.push(thisCdsDp)
		})
		let dpArrDiff = _.xorWith(CheckCdsDpArr, CheckVszDpArr, _.isEqual);
		if(dpArrDiff && dpArrDiff.length){
			configDiffFound = true
		}		
		let syncDate = new Date();				  
		await ClusterModel.findOneAndUpdate({ name: controller.name }, { zones : zonesCds, stats : inventoryStats, controllerips: controlIpsCds , managementips: managementIpsCds, lastsynchtime : syncDate })
		if(configDiffFound){
			logger.info('Cluster config diff found for cluster (%s) during schedule sync', controller.name)
			let description = 'Cluster schedule config sync for cluster '+controller.name+' completed successfully';
			auditLogData.description = description
			CommonService.createAuditLog(auditLogData)
		}else{
			logger.info('Cluster config diff not found for cluster (%s) during schedule sync', controller.name)
		}
		  logger.info('Inventory data for controller (%s) is updated', controller.name)
		  if(controller.apsimported || controller.numberofaps != 0){
			  let apSummarylist = await inventoryObj._getAPSummary()
			  logger.info("AP Summary list Count : "+JSON.stringify(apSummarylist.length));
			  let apList = await APModel.find({clustername : controller.name});
			  let counterOuter = 0;
			  let counterOuter1 = 0;
			  let APArrList = [];	
			  let APArrList1 = [];	
			  if(apList.length){
				  _.forEach(apList, async (cdsApInfo) => {
					  let counter = 0;
					  let currentDate = new Date();				  
					  var apFoundInCluster = false;
					  var clusterApInfo = aputils.filterApListbySerial(apSummarylist, cdsApInfo.apserial);
					  if(clusterApInfo){
							let cdcZones = controller.zones;
							let ApZoneName = '';
							let ApZoneId = '';
							if(clusterApInfo.zoneId){
								//Based on the get APs query API testing, we are getting zoneName empty in that case match the zoneId in CDS to get zoneName for 3.5
								if(clusterApInfo.zoneName == ''){
									cdcZones.forEach(function(zone) {
										if(zone.id == clusterApInfo.zoneId){
											ApZoneName = zone.name;
										}
									}); 
								}else{
									ApZoneName = clusterApInfo.zoneName;	
								}
								ApZoneId = clusterApInfo.zoneId;
							}else if(clusterApInfo.zoneUUID){
								ApZoneName = clusterApInfo.zoneName;
								ApZoneId = clusterApInfo.zoneUUID;
							}
							let apStatus = clusterApInfo.status ? clusterApInfo.status : '';
							let cdsClusterState = aputils.getcdsclusterstate(clusterApInfo.connectionStatus, apStatus, cdsApInfo.last_contacted);
							let clusterApState = clusterApInfo.status ? clusterApInfo.status : aputils.getApState(clusterApInfo.connectionStatus);
							let apIp = clusterApInfo.ip ? (clusterApInfo.ipv6Address ? clusterApInfo.ip +' / '+clusterApInfo.ipv6Address : clusterApInfo.ip) : (clusterApInfo.ipv6Address ? clusterApInfo.ipv6Address : '')
							if(clusterApInfo.connectionStatus != cdsApInfo.connectionstate || cdsClusterState != cdsApInfo.cds_cluster_state || ApZoneId != cdsApInfo.zoneid || cdsApInfo.clusterapstate != clusterApState){
								let updateAP = { apserial: cdsApInfo.apserial, model: clusterApInfo.model, ip: apIp, zonename: ApZoneName, zoneid: ApZoneId, connectionstate:clusterApInfo.connectionStatus, cds_cluster_state: cdsClusterState, clusterapstate : clusterApState,  lastsynchtime : currentDate, last_modified : currentDate}
								APArrList.push(updateAP);	
							}								
					  }else{
						let cdsClusterState = 'NOTINCLUSTER';
						let clusterApState = '';
						//if ap not found in cluster , updating zonename: '', zoneid: '', connectionstate = '', to move that ap in other cluster
						if(cdsApInfo.cds_cluster_state != cdsClusterState && cdsApInfo.clusterid != "" && cdsApInfo.zoneid != ""){
							let ApNotInCluster = { apserial: cdsApInfo.apserial, zonename: '', zoneid: '', connectionstate : '', cds_cluster_state: cdsClusterState, clusterapstate : clusterApState, lastsynchtime : currentDate, last_modified : currentDate}
							APArrList.push(ApNotInCluster);
						}
					  }
					  counterOuter = counterOuter + 1;
					  if(apList.length == counterOuter){
						if(APArrList.length){							
							logger.info('(%s) AP found to update status for controller (%s)', APArrList.length, controller.name)
							aputils.savebulkAps(APArrList, APModel, 'apserial').then(function(result){
								logger.info('CDS APs config sync with cluster '+controller.name+' completed successfully')
								let description = 'CDS APs updated during config sync process for cluster '+controller.name+' completed successfully';
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)
							}).catch(function (err) {
								logger.info('Error while updatiog AP summary data for controller (%s)', controller.name)
							});
						}else{
							logger.info('No AP Updated for controller (%s)', controller.name)
						}
					  }
				  }) 
			  }else{
				logger.info('No AP found for controller (%s) in CDS', controller.name)
			  }
			if(controller.apsimported){
			  if(apSummarylist.length){
				  let apList1 = await APModel.find({clustername : controller.name});
				   _.forEach(apSummarylist, async (clusterApInfo1) => {
					  let currentDate1 = new Date();				  
					  var apFoundInCluster1 = false;
					  var cdsApInfo1 = aputils.filterCdsApList(apList1, clusterApInfo1.serial);
					  if(!cdsApInfo1){
							let cdcZones1 = controller.zones;
							let ApZoneName1 = '';
							let ApZoneId1 = '';
							if(clusterApInfo1.zoneId){
								//Based on the get APs query API testing, we are getting zoneName empty in that case match the zoneId in CDS to get zoneName for 3.5
								if(clusterApInfo1.zoneName == ''){
									cdcZones1.forEach(function(zone) {
										if(zone.id == clusterApInfo1.zoneId){
											ApZoneName1 = zone.name;
										}
									}); 
								}else{
									ApZoneName1 = clusterApInfo1.zoneName;	
								}
								ApZoneId1 = clusterApInfo1.zoneId;
							}else if(clusterApInfo1.zoneUUID){
								ApZoneName1 = clusterApInfo1.zoneName;
								ApZoneId1 = clusterApInfo1.zoneUUID;
							}
							let apStatus1 = clusterApInfo1.status ? clusterApInfo1.status : '';
							let cdsClusterState1 = aputils.getcdsclusterstate(clusterApInfo1.connectionStatus, apStatus1, '');
							let clusterApState1 = clusterApInfo1.status ? clusterApInfo1.status : aputils.getApState(clusterApInfo1.connectionStatus);
							let apIp = clusterApInfo1.ip ? (clusterApInfo1.ipv6Address ? clusterApInfo1.ip +' / '+clusterApInfo1.ipv6Address : clusterApInfo1.ip) : (clusterApInfo1.ipv6Address ? clusterApInfo1.ipv6Address : '')
							const addNewAP1 = {
								apserial: clusterApInfo1.serial,
								clusterid : controller.id,
								clustername : controller.name,
								mac: clusterApInfo1.apMac == clusterApInfo1.serial ? '' : clusterApInfo1.apMac,
								apname: clusterApInfo1.deviceName,
								model: clusterApInfo1.model,
								ip: apIp,
								zonename: ApZoneName1,
								zoneid: ApZoneId1,
								connectionstate:clusterApInfo1.connectionStatus,
								configmethod:"IMPORTED",
								cds_cluster_state: cdsClusterState1,
								clusterapstate: clusterApState1,
								username: 'admin',
								lastsynchtime : currentDate1,
								last_modified : currentDate1
							}
							APArrList1.push(addNewAP1);		
					  }
					  counterOuter1 = counterOuter1 + 1;
					  if(apSummarylist.length == counterOuter1){
						if(APArrList1.length){							
							logger.info('(%s) new AP found to add in controller (%s)', APArrList1.length, controller.name)
							aputils.savebulkAps(APArrList1, APModel, 'apserial').then(function(result){
								Apupdated1 = result.nModified;
								ApSuccess1 = result.nUpserted;
								logger.info(ApSuccess1 + " APs Added, "+ Apupdated1 + " APs updated for controller (%s)", controller.name)
								CommonService.populateNumberOfAPsPerCluster(controller.id, function(error, result){
									if(error){
										logger.error("vSZ APs Imported for cluster "+controller.name+" completed successfully, but error while populating number of APs in cluster"+result)
									}else{
										let description = 'vSZ APs Imported during config sync process for cluster '+controller.name+' completed successfully';
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
									}
								});
							}).catch(function (err) {
								logger.info('Error while importing APs from back process for controller (%s)', controller.name)
							});
						}else{
							logger.info('No New AP found to add in controller (%s)', controller.name)
						}
					  }
				  }) 
			  }else{
				 logger.info('No AP found for controller (%s) in vSZ', controller.name)
			  }
			}else{
				logger.info('No AP imported for controller (%s) in CDS', controller.name)
			}
		  }else{
			logger.info('No AP imported or no AP found to update status for controller (%s) in CDS', controller.name)
		  }
	  } catch (error) {
		logger.info(error)
		// without validate session, we have to mark the task complete
		const inventory = new Inventory(conn, controller.name, false, overallProgressTracker, onCompleteCallback)
		if (inventory._isTest) {
		  inventory._onTestFailure(error.data.request, error.data.response, error.data.error)
		} else {
		  inventory._updateConnectionState('offline')
		}
		inventory._onTaskComplete()
	  }
    })

  } catch(err) {
    logger.info('Inventory task failed to start')
    logger.info(err)
  }
}

// the callback function for the schedule task
exports.getInventoryForCluster = async(ipAddress, callback) => {
  logger.info('Get Inventory Stats Back Process For Cluster Start :'+ipAddress)
  let controllers = null
  try {
    let controller = await ClusterModel.findOne({ip : ipAddress});
    const overallProgressTracker = {
      pendingTaskCount: 1,
      completeTaskCount: 0,
      successTaskCount: 0
    }
    const connectIp = controller.ip ? controller.ip : controller.managementips
	conn = new Connection(controller.id, connectIp, controller.loginid, controller.password)
	
	// the available IPs
	let availableIps = null
	try {
	  availableIps = controller.managementips
	  logger.info('update the list of management ip (%j) for controller (%s)', availableIps, controller.name)
	  conn.updateAvailableIps(availableIps)
	} catch (err) {
	  logger.info('failed to retrieve the list of management ip for controller (%s)', controller.name)
	  logger.info(err)
	}
	try {
		await conn.getValidateSessionAsync()
		if (conn.is35orLater()) {
			var inventoryObj = new Inventory35(conn, controller.name, false, overallProgressTracker, null)
		}else{
			var inventoryObj = new Inventory34(conn, controller.name, false, overallProgressTracker, null)  
		}
		let inventoryStats = await inventoryObj._getSmartZoneData()
		await ClusterModel.findOneAndUpdate({ name: controller.name }, { stats : inventoryStats })	  
		callback(false,'');
	} catch (error) {
		logger.info(error)
		// without validate session, we have to mark the task complete
		const inventory = new Inventory(conn, controller.name, false, overallProgressTracker, onCompleteCallback)
		if (inventory._isTest) {
		  inventory._onTestFailure(error.data.request, error.data.response, error.data.error)
		} else {
		  inventory._updateConnectionState('offline')
		}
		inventory._onTaskComplete()
		callback(true,error);
	}
  } catch(err) {
    logger.info('Inventory task failed to start')
    logger.info(err)
	callback(true,err);
  }
}



// the callback function for the schedule task
exports.getApListFromCluster = async(ipAddress, callback) => {
  logger.info("Get AP Summary For cluster back process started")
  try {
    let controller = await ClusterModel.findOne({ip : ipAddress});
    const overallProgressTracker = {
      pendingTaskCount: 1,
      completeTaskCount: 0,
      successTaskCount: 0
    }      
	const connectIp = controller.ip ? controller.ip : controller.managementips
	conn = new Connection(controller.id, connectIp, controller.loginid, controller.password)
	// the available IPs
	let availableIps = null
	try {
	  availableIps = controller.managementips
	  logger.info('update the list of management ip (%j) for controller (%s)', availableIps, controller.name)
	  conn.updateAvailableIps(availableIps)
	} catch (err) {
	  logger.info('failed to retrieve the list of management ip for controller (%s)', controller.name)
	  logger.info(err)
	}
		
	try {
		await conn.getValidateSessionAsync()
		if (conn.is35orLater()) {
			var inventoryObj = new Inventory35(conn, controller.name, false, overallProgressTracker, null)
	    }else{
			var inventoryObj = new Inventory34(conn, controller.name, false, overallProgressTracker, null)  
	    }
		let apSummaryList = await inventoryObj._getAPSummary()
		callback(false,apSummaryList);
	} catch (error) {
		logger.info(error)
		// without validate session, we have to mark the task complete
		const inventory = new Inventory(conn, controller.name, false, overallProgressTracker, onCompleteCallback)
		if (inventory._isTest) {
		  inventory._onTestFailure(error.data.request, error.data.response, error.data.error)
		} else {
		  inventory._updateConnectionState('offline')
		}
		inventory._onTaskComplete()
		callback(true,error);
	}
  } catch(err) {
    logger.info('Inventory task failed to start')
    logger.info(err)
	callback(true,err);
  }
}
