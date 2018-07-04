var express = require('express')
var jsonfile = require('jsonfile')
var router = express.Router()
var app = express()
var logger = require("../config/logger.config")
var ClusterModel = require('../models/ClusterModel')
var APModel = require('../models/AccessPointModel')
var Inventory34 = require('../szcomm/inventory34')
var Inventory35 = require('../szcomm/inventory35')
var Connection = require('../szcomm/connection')
const _ = require('lodash')
var aputils = require('../utils/aputils');
var CommonService = require('./common.service');

//get dashboard summary for controllers from CDS DB
router.get('/dashboard/summary/:ipaddress?', async(req, res, next) => {
	logger.info("Get dashboard summary from cds API start from here")
	let controllers = null
	try {
		//controllers = await ClusterModel.find({})
		var controllerIp = req.params.ipaddress
		if(controllerIp != "" && controllerIp != undefined){
			controllers = await ClusterModel.find({ip : controllerIp })
		}else{
			controllers = await ClusterModel.find({})
		}
		let totalClusters = controllers.length
		let totalClients = 0
		let totalZones = 0
		let clusterState = {
			"online" : 0,
			"flagged" : 0,
			"offline" : 0
		}
		let cdsConnectionState = {
			"online" : 0,
			"flagged" : 0,
			"offline" : 0
		}
		let apState = {
			"online" : 0,
			"flagged" : 0,
			"offline" : 0
		}
		let cpState = {
			"online" : 0,
			"flagged" : 0,
			"offline" : 0
		}
		let dpState = {
			"online" : 0,
			"flagged" : 0,
			"offline" : 0
		}
		let licenseState = {
			"consumed" : 0,
			"total" : 0
		}
		let provisionAPState = {
			"imported" : 0,
			"provisioned" : 0,
			"unprovisioned" : 0,
			"defaultprovisioned" : 0
		}
		let apModels = []
		let clusters = []
		let osTypes = []
		let finalStats = null
		let counterInner = 0
		_.forEach(controllers, async (cluster) => {
			provisionAPState.imported += cluster.numberofimportedaps
			provisionAPState.provisioned += cluster.numberofprovisionaps
			provisionAPState.unprovisioned += cluster.numberofunprovisionaps
			provisionAPState.defaultprovisioned += cluster.numberofdefaultprovisionaps
			let clusterApOnline = 0
			let clusterApFlagged = 0
			let clusterApOffline = 0
			let clusterClientCount = 0
			let clusterZoneCount = 0
			if(cluster.stats != undefined){
				if(cluster.stats.systemsummary != undefined){
					if(cluster.stats.systemsummary.clusterState == 'online'){
						clusterState.online += 1
					}
					if(cluster.stats.systemsummary.clusterState == 'flagged'){
						clusterState.flagged += 1
					}
					if(cluster.stats.systemsummary.clusterState == 'offline'){
						clusterState.offline += 1
					}
					if(cluster.stats.systemsummary.apLicenseConsumed){
						licenseState.consumed += cluster.stats.systemsummary.apLicenseConsumed
					}
					if(cluster.stats.systemsummary.apLicenseTotal){
						licenseState.total += cluster.stats.systemsummary.apLicenseTotal
					}
				}else{
					clusterState.offline += 1
				}
				
				if(cluster.status == '0'){
					cdsConnectionState.offline += 1
				}
				if(cluster.status == '1'){
					cdsConnectionState.online += 1
				}
				if(cluster.status == '2'){
					cdsConnectionState.flagged += 1
				}
				
				if(cluster.stats.zoneinventory != undefined){
					if(cluster.stats.zoneinventory.zonesummary != undefined){
						_.forEach(cluster.stats.zoneinventory.zonesummary, async (apStateData) => {
							apState.online += apStateData.apOnline				
							apState.flagged += apStateData.apFlagged				
							apState.offline += apStateData.apOffline
							clusterApOnline += apStateData.apOnline				
							clusterApFlagged += apStateData.apFlagged				
							clusterApOffline += apStateData.apOffline
							clusterClientCount += apStateData.client
							clusterZoneCount += 1
						})
					}
					let apModelFound = false
					if(cluster.stats.zoneinventory.apmodelsummary != undefined){
						_.forEach(cluster.stats.zoneinventory.apmodelsummary, async (apmodelData) => {
							const apModelObj = {
								"apModel": apmodelData.apModel,
								"apOnline": apmodelData.apOnline,
								"apFlagged": apmodelData.apFlagged,
								"apOffline": apmodelData.apOffline
							}
							apModels.find((o, i) => {
								if (o.apModel === apmodelData.apModel) {
									apModelFound = true
									let apOnline = o.apOnline + apmodelData.apOnline
									let apFlagged = o.apFlagged + apmodelData.apFlagged
									let apOffline = o.apOffline + apmodelData.apOffline
									apModels[i] = {"apModel": o.apModel, "apOnline": apOnline, "apFlagged": apFlagged, "apOffline": apOffline};
									return true; // stop searching
								}else{
									apModelFound = false
								}
							});
							if(!apModelFound){
								apModels.push(apModelObj)
							}
						})
					}
					let osTypeFound = false
					if(cluster.stats.zoneinventory.ostypesummary != undefined){
						_.forEach(cluster.stats.zoneinventory.ostypesummary, async (ostypeData) => {
							const osTypeModelObj = { 
								"osType": ostypeData.osType,
								"count": ostypeData.count
							}
							osTypes.find((o, i) => {
								if (o.osType === ostypeData.osType) {
									osTypeFound = true
									let count = o.count + ostypeData.count
									osTypes[i] = {"osType": o.osType, "count": count};
									return true; // stop searching
								}else{
									osTypeFound = false
								}
							});
							if(!osTypeFound){
								osTypes.push(osTypeModelObj)
							}
						})
					}					
				}
				if(cluster.stats.cplist != undefined){
					_.forEach(cluster.stats.cplist, async (cplistData) => {
						if(cplistData.status == 'online'){
							cpState.online += 1
						}
						if(cplistData.status == 'flagged'){
							cpState.flagged += 1
						}
						if(cplistData.status == 'offline'){
							cpState.offline += 1
						}
					})
				}
				if(cluster.stats.dplist != undefined){
					_.forEach(cluster.stats.dplist, async (dplistData) => {
						if(dplistData.status == 'online'){
							dpState.online += 1
						}
						if(dplistData.status == 'flagged'){
							dpState.flagged += 1
						}
						if(dplistData.status == 'offline'){
							dpState.offline += 1
						}
					})
				}
			}
			const clusterModelObj = { 
				"clusterId": cluster.id,
				"clusterName": cluster.name,
				"controllerips": cluster.controllerips,
				"managementips": cluster.managementips,
				"zone": clusterZoneCount,
				"client": clusterClientCount,
				"apLicenseTotal": cluster.stats ? (cluster.stats.systemsummary ? cluster.stats.systemsummary.apLicenseTotal : 0 ) : 0,
				"apLicenseConsumed": cluster.stats ? (cluster.stats.systemsummary ? cluster.stats.systemsummary.apLicenseConsumed : 0 ) : 0,
				"apOnline": clusterApOnline,
				"apFlagged": clusterApFlagged,
				"apOffline": clusterApOffline,
				"systemsummary": cluster.stats ? (cluster.stats.systemsummary ? cluster.stats.systemsummary : '' ) : {},
				"apmodelsummary": cluster.stats ? (cluster.stats.zoneinventory ? cluster.stats.zoneinventory.apmodelsummary : '' ) : [],
				"ostypesummary": cluster.stats ? (cluster.stats.zoneinventory ? cluster.stats.zoneinventory.ostypesummary : '' ) : [],
				"zonesummary": cluster.stats ? (cluster.stats.zoneinventory ? cluster.stats.zoneinventory.zonesummary : '' ) : [],
				"dplist": cluster.stats ? (cluster.stats.dplist ? cluster.stats.dplist : '' ) : [],
				"cplist": cluster.stats ? (cluster.stats.cplist ? cluster.stats.cplist : '' ) : [],
				"lastsynchtime": cluster.lastsynchtime ? cluster.lastsynchtime : ''
			}
			clusters.push(clusterModelObj)
			
			totalClients += clusterClientCount
			totalZones += clusterZoneCount
			
			
			counterInner++
			if(counterInner == controllers.length){
				finalStats = {"totalClusters" : totalClusters, "totalClients" : totalClients, "totalZones" : totalZones, "licenseState" : licenseState, "clusterState" : clusterState, "cdsConnectionState" : cdsConnectionState, "provisionAPState" : provisionAPState, "apState" : apState, "cpState" : cpState, "dpState" : dpState, "osTypes" : osTypes, "apModels" : apModels, "clusters" : clusters}
				return res.json({
					success: true,
					stats: finalStats
				})
			}
		})
		if(!totalClusters){
			return res.json({
				success: false,
				message: "No Cluster Found"
			})
		}
		
    } catch(err) {
      logger.error('Inventory task failed to start')
      return res.json({
			success: false,
			message: "Get inventory details failed: "+err
		})
    }
})


//get dashboard summary live data
router.get('/dashboard/summarylive/:ipaddress?', async(req, res, next) => {
	logger.info("Get dashboard summary API start from here")
	let controllers = null
	var sourceip = aputils.getClientIp(req);
	var action = "Config Sync"
	var resource = "Cluster"
	var username = req.decoded.username
	var description = ""
	const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
	try {
	  //controllers = await ClusterModel.find({})
	  var controllerIp = req.params.ipaddress
	  if(controllerIp != "" && controllerIp != undefined){
		controllers = await ClusterModel.find({ip : controllerIp })
	  }else{
		controllers = await ClusterModel.find({})
	  }
	  Connection.connections = {}
	  const overallProgressTracker = {
		pendingTaskCount: controllers.length,
		completeTaskCount: 0,
		successTaskCount: 0
	  }
	  let counter = 0
	  _.forEach(controllers, async (controller) => {
		let conn = Connection.findConnection(controller._id)
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
			conn.updateAvailableIps(availableIps)
		  } catch (err) {
			logger.error('failed to retrieve the list of management ip for controller (%s)', controller.name)
			logger.error(err)
		  }
		}
		conn.getValidateSession(async(success, request, response, error) => {
			if(success){
				if (conn.is35orLater()) {
					var inventoryObj = new Inventory35(conn, controller.name, false, overallProgressTracker, null)
				}else{
					var inventoryObj = new Inventory34(conn, controller.name, false, overallProgressTracker, null)  
				}
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
				//if there is change in the dp list it means diff found other wise check for other params  (except - uptime & status)
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
					logger.info('Cluster config diff found for cluster (%s) during mannual sync', controller.name)
					let description = 'Cluster mannual config sync for cluster '+controller.name+' completed successfully';
					auditLogData.description = description
					CommonService.createAuditLog(auditLogData)
				}else{
					logger.info('Cluster config diff not found for cluster (%s) during mannual sync', controller.name)
				}				
				if(controller.apsimported || controller.numberofaps != 0){
				  let apSummarylist = await inventoryObj._getAPSummary()
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
								aputils.savebulkAps(APArrList, APModel, 'apserial').then(function(result){
									let description = 'CDS APs config sync with cluster '+controller.name+' completed successfully';
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
								aputils.savebulkAps(APArrList1, APModel, 'apserial').then(function(result){
									Apupdated1 = result.nModified;
									ApSuccess1 = result.nUpserted;
									CommonService.populateNumberOfAPsPerCluster(controller.id, function(error, result){
										if(error){
											logger.error("vSZ APs Imported for cluster "+controller.name+" completed successfully, but error while populating number of APs in cluster"+result)
										}else{
											let description = 'vSZ APs Imported for cluster '+controller.name+' completed successfully';
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
				counter++
			}else{
				if(response && response.data){
					return res.json({
						success: false,
						message: "Error while reaching cluster : "+response.data.message
					})
				}else{
					return res.json({
						success: false,
						message: "Cluster IP ["+controllerIp+"] not reachable"
					})
				}
			}
			if(counter == controllers.length){				
				if(controllers.length > 1){
					return res.json({
						success: true,
						message: "Inventory live data for all controllers is updated in CDS"
					})
				}else{
					return res.json({
						success: true,
						message: "Inventory live data for controller is updated in CDS"
					})
				}
				
			}
		})
	  })
	  if(!controllers.length){
		return res.json({
			success: false,
			message: "No Cluster Found"
		})
	  }
    } catch(err) {
      logger.error('Get live Inventory task failed to start')
      return res.json({
			success: false,
			message: "Get live inventory details failed: "+err
		})
    }
})

//sync cluster with vSZ
router.get('/clusterconfigsync/:ipaddress', async(req, res, next) => {
	logger.info("Sync cluster with vSZ API start from here")
	let controller = null
	let inventoryObj = null
	var zonesCds = [];
	var sourceip = aputils.getClientIp(req);
	var action = "Config"
	var resource = "Cluster"
	var username = req.decoded.username
	var description = ""
	const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
	try {
	  var controllerIp = req.params.ipaddress
	  controller = await ClusterModel.findOne({ip : controllerIp })
	  Connection.connections = {}
	  const overallProgressTracker = {
		pendingTaskCount: 1,
		completeTaskCount: 0,
		successTaskCount: 0
	  }
	  let counter = 0
	  let conn = Connection.findConnection(controller._id)
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
			conn.updateAvailableIps(availableIps)
		  } catch (err) {
			logger.info('failed to retrieve the list of management ip for controller (%s)', controller.name)
			logger.info(err)
		  }
		}
		conn.getValidateSession(async(success, request, response, error) => {
			if(success){
				if (conn.is35orLater()) {
					inventoryObj = new Inventory35(conn, controller.name, false, overallProgressTracker, null)
				}else{
					inventoryObj = new Inventory34(conn, controller.name, false, overallProgressTracker, null)  
				}
				let inventoryStats = await inventoryObj._getSmartZoneData()
				let zonesummary = inventoryStats.zoneinventory ? inventoryStats.zoneinventory.zonesummary : []
				_.forEach(zonesummary, async (clusterZoneInfo) => {
					const thisZone = {
						id: clusterZoneInfo.zoneId,
						name: clusterZoneInfo.zoneName
					}
					zonesCds.push(thisZone)
				})
				if(controller.zones.length != zonesCds.length){
					logger.info('Config diff found between cds zones list and vSZ zones list data for controller (%s)', controller.name)
				}else{
					logger.info('No config diff found between cds zones list and vSZ zones list data for controller (%s)', controller.name)
				}
				let syncDate = new Date();				  
				await ClusterModel.findOneAndUpdate({ name: controller.name }, { zones : zonesCds, stats : inventoryStats, lastsynchtime : syncDate })
				let description = 'Zone inventory config data sync for cluster '+controller.name+' completed successfully';
				auditLogData.description = description
				CommonService.createAuditLog(auditLogData)				
				if(controller.apsimported && controller.numberofaps != 0){
					let apSummarylist = await inventoryObj._getAPSummary()			
					let apList = await APModel.find({clustername : controller.name});
					let counterOuter = 0;
					let APArrList = [];	
					if(apSummarylist.length){
					   _.forEach(apSummarylist, async (clusterApInfo) => {
						  let currentDate = new Date();				  
						  var apFoundInCluster = false;
						  var cdsApInfo = aputils.filterCdsApList(apList, clusterApInfo.serial);
						  if(!cdsApInfo){
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
								let cdsClusterState = aputils.getcdsclusterstate(clusterApInfo.connectionStatus, apStatus, '');
								let clusterApState = clusterApInfo.status ? clusterApInfo.status : aputils.getApState(clusterApInfo.connectionStatus);
								const addNewAP = {
									apserial: clusterApInfo.serial,
									clusterid : controller.id,
									clustername : controller.name,
									mac: clusterApInfo.apMac == clusterApInfo.serial ? '' : clusterApInfo.apMac,
									apname: clusterApInfo.deviceName,
									model: clusterApInfo.model,
									ip: clusterApInfo.ip,
									zonename: ApZoneName,
									zoneid: ApZoneId,
									connectionstate:clusterApInfo.connectionStatus,
									configmethod:"IMPORTED",
									cds_cluster_state: cdsClusterState,
									clusterapstate: clusterApState,
									username: req.decoded.username,
									lastsynchtime : currentDate,
									last_modified : currentDate
								}
								APArrList.push(addNewAP);		
						  }
						  counterOuter = counterOuter + 1;
						  if(apSummarylist.length == counterOuter){
							if(APArrList.length){							
								aputils.savebulkAps(APArrList, APModel, 'apserial').then(function(result){
									Apupdated = result.nModified;
									ApSuccess = result.nUpserted;
									CommonService.populateNumberOfAPsPerCluster(controller.id, function(error, result){
										if(error){
											logger.error("APs config data sync for cluster completed successfully, but error while populating number of APs in cluster"+result)
										}else{
											let description = 'APs config data sync for cluster '+controller.name+' completed successfully';
											auditLogData.resource = 'Access Point'
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
										}
									});
								}).catch(function (err) {
									logger.info('Error while APs config data sync for controller (%s)', controller.name)
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
					logger.info('No AP imported yet for controller (%s) in CDS', controller.name)
				}
				return res.json({
					success: true,
					message: "Cluster configuration sync is completed successfully"
				})				
			}else{
				if(response && response.data){
					return res.json({
						success: false,
						message: "Error while reaching cluster for data sync : "+response.data.message
					})
				}else{
					return res.json({
						success: false,
						message: "Cluster IP ["+controllerIp+"] not reachable"
					})
				}
			}
		})
    } catch(err) {
		logger.error('Sync cluster with vSZ API failed')
		return res.json({
			success: false,
			message: "Sync cluster with vSZ API failed: "+err
		})
    }
})

module.exports = router