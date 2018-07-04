var request = require('request');
const _ = require('lodash')
const cron = require('node-cron');
var Q = require('q');
var logger = require("../config/logger.config");
var ClusterModel = require('../models/ClusterModel');
var APModel = require('../models/AccessPointModel');
var AuditTrailModel = require('../models/AuditTrailModel');
var CommonCluster = require('./CommonCluster');
var backprocess = require('../szcomm/backprocess');
var aputils = require('../utils/aputils');

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

exports.populateApDataWhenClusterAdded = function(clusterIp,loginId,password,clusterId,clusterName,zones,loggedInUser,callback){
  try{
    var view = this;
    var success = false;
    var message = "";
    var currentDate = new Date();
    backprocess.getApListFromCluster(clusterIp, function(error, result){
      if(error){
        logger.info("Import APs : Error found while importing APs list from cluster ip ["+clusterIp+"]")
        logger.error(result)
		message = "Error while populating APs data";
        success = false;
        callback(message ,success);
      }else{
        APsData = result;
        var counter = 0, ApFailed = 0, ApSuccess = 0, Apupdated = 0;
        let APArrList = [];
        let clusterIdNew = clusterId.toString();
        APsData.forEach(function(APInfo) {
          var ApZoneName = '';
          var ApZoneId = '';
		  if(APInfo.zoneId){
			//Based on the get APs query API testing, we are getting zoneName empty in that case match the zoneId in CDS to get zoneName for 3.5
			if(APInfo.zoneName == ''){
				zones.forEach(function(zone) {
					if(zone.id == APInfo.zoneId){
						ApZoneName = zone.name;
					}
				}); 
		    }else{
				ApZoneName = APInfo.zoneName;	
			}
			ApZoneId = APInfo.zoneId;
		  }else if(APInfo.zoneUUID){
			ApZoneName = APInfo.zoneName;
			ApZoneId = APInfo.zoneUUID;
		  }		  
		  let apStatus = APInfo.status ? APInfo.status : '';
          let cdsClusterState = aputils.getcdsclusterstate(APInfo.connectionStatus, apStatus, null);
		  let clusterApState = APInfo.status ? APInfo.status : aputils.getApState(APInfo.connectionStatus);
		  let apIp = APInfo.ip ? (APInfo.ipv6Address ? APInfo.ip +' / '+APInfo.ipv6Address : APInfo.ip) : (APInfo.ipv6Address ? APInfo.ipv6Address : '')
          const updateAP = {
            apserial: APInfo.serial,
            clusterid : clusterIdNew,
            clustername : clusterName,
            mac: APInfo.apMac == APInfo.serial ? '' : APInfo.apMac,
            apname: APInfo.deviceName,
            model: APInfo.model,
            ip: apIp,
            zonename: ApZoneName,
            zoneid: ApZoneId,
            connectionstate:APInfo.connectionStatus,
            configmethod:"IMPORTED",
            cds_cluster_state: cdsClusterState,
            clusterapstate: clusterApState,
            username: loggedInUser,
            lastsynchtime : currentDate,
            last_modified : currentDate
          }
          APArrList.push(updateAP)
          counter = counter + 1;
          if(counter == APsData.length){
			aputils.savebulkAps(APArrList, APModel, 'apserial').then(function(result){
              Apupdated = result.nModified;
              ApSuccess = result.nUpserted;
              success = true;
              message = ApSuccess + " APs Added, "+ Apupdated + " APs updated";
              callback(message ,success);
            }).catch(function (err) {
              logger.info(dbErrorMessage)
			  logger.error(err)
			  success = false;
              message = dbErrorMessage;
              callback(message ,success);
            });
          }

        });
        if(!APsData.length){
          logger.info("Import APs : No APs Found to import for cluster ip ["+clusterIp+"]")
		  message = "No APs Found to import";
          success = true;
          callback(message ,success);
        }
      }
    })
  } catch(e){
    logger.info("Import APs : Exception while importing APs for cluster ip ["+clusterIp+"]")
	logger.error(e)
	success = false;
    message = "Exception while importing APs : "+e;
    callback(message ,success);
  }
}

exports.populateNumberOfAPsPerCluster = async(clusterId,callback) => {
	try{
		let numberofAPsCount = 0;
		let numberofImportedAPsCount = 0;
		let numberofProvisionAPsCount = 0;
		let numberofUnProvisionAPsCount = 0;
		let numberofDefaultProvisionAPsCount = 0;
		numberofAPsCount = await APModel.count({ clusterid : clusterId});
		numberofImportedAPsCount = await APModel.count({ clusterid : clusterId, configmethod : 'IMPORTED'});
		numberofProvisionAPsCount = await APModel.count({ clusterid : clusterId, configmethod : 'PROVISIONED'});
		numberofUnProvisionAPsCount = await APModel.count({ clusterid : clusterId, configmethod : 'UNPROVISIONED'});
		numberofDefaultProvisionAPsCount = await APModel.count({ clusterid : clusterId, configmethod : 'DEFAULT_PROVISIONED'});
		var currentDate = new Date();
		ClusterModel.findOneAndUpdate({ _id: clusterId }, { numberofaps: numberofAPsCount, numberofimportedaps : numberofImportedAPsCount, numberofprovisionaps : numberofProvisionAPsCount, numberofunprovisionaps : numberofUnProvisionAPsCount, numberofdefaultprovisionaps : numberofDefaultProvisionAPsCount,  last_modified: currentDate }, function(err, data) {
			if(err){
				logger.info(dbErrorMessage)
				logger.error(err)
				error = true;
				message = dbErrorMessage;
				callback(error ,message);
			}else{
				error = false;
				message = "Number of APs updated in cluster Id: "+clusterId;
				callback(error ,message);
			}		
		});
	} catch(e){
		logger.info("Exception occur while updating number of APs in cluster")
		logger.error(e)
		error = true;
		message = "Exception while count number of APs : "+e;
		callback(error ,message);
	}
}

exports.checkIfDefaultClusterExist = function(callback){
	try{
		ClusterModel.findOne({ defaultcluster : true}, function(err, clusterFound) {
			if(err){
				logger.info(dbErrorMessage)
				logger.error(err)
				error = true;
				message = dbErrorMessage;
				callback(error ,message);
			}else if(clusterFound) {	
				error = false;
				callback(error ,clusterFound._id);
			}else{
				error = false;
				message = "";
				callback(error ,message);
			}
		});	
	} catch(e){
		logger.info("Exception occur while checking default cluster")
		logger.error(e)
		error = true;
		message = "Exception while checking default cluster : "+e;
		callback(error ,message);
	}
}

exports.getAPStatus = function(APSerialNumber, callback){
	try{
		var currentDate = new Date();
		APModel.findOne({ apserial: APSerialNumber }, function(err, ap) {
			if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				error = true;
				message = dbErrorMessage;
				callback(error ,message);
			}else if(!ap){
				error = true;
				message = "AP not found";
				callback(error ,message);
			}else{
				//find cluster
				ClusterModel.findOne({ _id: ap.clusterid }, function(err, cluster) {
					logger.info('ClusterModel.findOne ip: '+JSON.stringify(cluster));			
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						error = true;
						message = dbErrorMessage;
						callback(error ,message);
					}else if(cluster){
						var CommonClusterObj = new CommonCluster(cluster.ip,cluster.loginid, cluster.password);	
						promiseCall = CommonClusterObj.login();
						promiseCall.then(function (result) {
							return CommonClusterObj.GetAP(APSerialNumber);										
						})	
						.then(function (result) {
							result = JSON.parse(result);
							if(result.zoneId == ap.zoneid){
								APModel.findOneAndUpdate({ apserial: APSerialNumber }, { connectionstate:result.connectionState, last_modified : currentDate, lastsynchtime : currentDate }, function(err, updatedAP) {
									if(err){
										logger.info(dbErrorMessage);
										logger.info(err);
										error = true;
										message = dbErrorMessage;
										callback(error ,message);
									}else{
										ap = JSON.stringify(ap);
										ap = JSON.parse(ap);
										error = false;
										ap.stats = {};
										ap.stats.configmatch = true;
										message = ap;
										callback(error ,message);
									}		
								});
							}else{
								error = false;
								ap = JSON.stringify(ap);
								ap = JSON.parse(ap);
								ap.stats = {};
								ap.stats.configmatch = false;
								ap.stats.zoneid = result.zoneId;
								message = ap;
								callback(error ,message);
							}
						})  
						.catch(function (reason) {
							logger.info("getAPStatus CommonClusterObj catch reason: "+reason);
							if(reason == "Unreachable"){							
								logger.info("Cluster IP not Reachable");
								error = true;
								message = "Cluster IP not Reachable";
								callback(error ,message);
							}else if(reason){
								result = JSON.parse(reason);
								if(result.errorType == "Resource cannot be found"){
									error = true;
									ap = JSON.stringify(ap);
									ap = JSON.parse(ap);
									ap.stats = {};
									ap.stats.configmatch = 'AP not found in smart zone';						
									message = ap;
									callback(error ,message);
								}else{								
									error = true;
									message = "Error : "+reason
									callback(error ,message);
								}
							}else{								
								error = true;
								message = "Error : "+reason
								callback(error ,message);
							}
						});
					}else{
						error = true;
						message = "AP cluster not found";
						callback(error ,message);
					}					
				});
			}
		});	
	} catch(e){
		logger.info("getAPStatus Exception :"+e);
		error = true;
		message = "Exception while get AP status : "+e;
		callback(error ,message);
	}
}

exports.getClusterStatus = function(clusterParams, callback){
	try{
		var controlIpCds = [];
		var managementIpCds = [];
		var zonesCds = [];
		var modelCds = "";
		var versionCds = "";
		var licenseCds = "";
		var controllerFound = false;
		var currentDate = new Date();
		ClusterModel.findOne({ $or: [ { ip: clusterParams }, { name: clusterParams } ] }, function(err, cluster) {
			if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				error = true;
				message = dbErrorMessage;
				callback(error ,message);
			}else if(!cluster){
				logger.info('ClusterModel.findOne cluster status not found : '+cluster);
				error = true;
				message = 'Cluster not found';
				callback(error ,message);
			}else{
				error = false;
				message = cluster.stats;
				callback(error ,message);
				/* var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
				promiseCall = CommonClusterObj.login();
				promiseCall.then(function (result) {
					return CommonClusterObj.getzones();
				})
				.then(function (result) {
					result = JSON.parse(result);
					zonesCds = result.list;			
					return CommonClusterObj.getControllerMgmtIP();
				})
				.then(function (result) {
					result = JSON.parse(result);
					var controllerData = result.list;				
					controllerData.forEach(function(vSZController) {
						//if(vSZController.clusterIp == cluster.ip){
							controlIpCds.push( vSZController.controlIp );
							managementIpCds.push( vSZController.managementIp );
							modelCds = vSZController.model;
							versionCds = vSZController.version;
							licenseCds = "AIR-CAS-1KC-K9";
							controllerFound = true;
						//}
					});
					if(!controllerFound){
						error = true;
						message = 'Controller IP not configured';
						callback(error ,message);
					}else{
						ClusterModel.findOneAndUpdate({ ip: cluster.ip }, { controllerips: controlIpCds , managementips: managementIpCds, zones:zonesCds,  last_modified: currentDate, stats : {model : modelCds, version : versionCds, license : licenseCds}, lastsynchtime : currentDate }, function(err, updatedCluster) {
							if(err){
								logger.info('ClusterModel.findOneAndUpdate error: '+err);
								error = true;
								message = 'Error :'+err;
								callback(error ,message);
							}else{
								logger.info('ClusterModel.findOneAndUpdate success: '+updatedCluster);
								var clusterStatus = {model : modelCds, version : versionCds, license : licenseCds};
								error = false;
								message = clusterStatus;
								callback(error ,message);								
							}
						});
					}				
				})  
				.catch(function (reason) {
					if(reason == "Unreachable"){
						ClusterModel.findOneAndUpdate({ ip: cluster.ip }, { status: 0, last_modified: currentDate }, function(err, updatedCluster) {
							if(err){
								logger.info('ClusterModel.findOneAndUpdate catch error: '+err);
								error = true;
								message = 'Error :'+err;
								callback(error ,message);			
							}else{
								logger.info('ClusterModel.findOneAndUpdate catch success: '+updatedCluster);
								error = true;
								message = 'Cluster not reachable';
								callback(error ,message);			
							}
						});
					}else{	
						error = true;
						message = "Error : "+reason;
						callback(error ,message);	
					}
				}); */
			}
		});	
	} catch(e){
		logger.info("getClusterStatus Exception :"+e);
		error = true;
		message = "Exception while get cluster status : "+e;
		callback(error ,message);
	}
}


exports.bulkapdelete = function(apSerialNumber, deleteFromVsz, ResMessages, callback){
	try{
		var view = this;
		APModel.findOne({apserial: apSerialNumber}, function (err, ApInfo) {
			if(err){					
				logger.info(dbErrorMessage);
				logger.info(err);
				ResMessages.push(dbErrorMessage);
				error = true;
				callback(error ,ResMessages);
			}else if(ApInfo && (ApInfo.apserial == apSerialNumber)){					
				if(ApInfo.clusterid){
					ClusterModel.findOne({_id: ApInfo.clusterid}, function (err, cluster) {
						if(err){
							logger.info(dbErrorMessage);
							logger.info(err);					
							ResMessages.push(dbErrorMessage);
							error = true;
							callback(error ,ResMessages);
						}else if(!cluster){
							ResMessages.push("Cluster IP not found of AP Serial Number : "+apSerialNumber);
							error = true;
							callback(error ,ResMessages);
						}else{
							if(ApInfo.cds_cluster_state != "NOTINCLUSTER" && ApInfo.zoneid != "" && (deleteFromVsz === true || deleteFromVsz == "true")){
								var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
								promiseCall = CommonClusterObj.login();
								promiseCall.then(function (result) {
									return CommonClusterObj.deleteAp(ApInfo.apserial);
								})
								.then(function (result) {
									result = JSON.parse(result);
									if(result.success){
										APModel.remove({apserial: apSerialNumber}, function (err) {
										  if(err){ 
											    logger.info(dbErrorMessage);
												logger.info(err);
												ResMessages.push(dbErrorMessage);
												error = true;
												callback(error ,ResMessages);
											}else{
												view.populateNumberOfAPsPerCluster(ApInfo.clusterid, function(error, result){
													if(error){
														logger.info('CommonService.populateNumberOfAPsPerCluster error: '+error);
														ResMessages.push(" AP ["+apSerialNumber+"] deleted successfully, but error while populating number of APs in cluster :"+result);
														error = false;
														callback(error ,ResMessages);
													}else{
														error = false;
														callback(error ,ResMessages);
													}
												});			
											}
										});
									}else{
										logger.info('Bulk AP deletion API error while calling SZ delete AP API: '+JSON.stringify(result));
										ResMessages.push("Error ["+apSerialNumber+"] : "+result.message);
										error = true;
										callback(error ,ResMessages);
									}
								})  
								.catch(function (reason) {
									if(reason == "Unreachable"){
										logger.info("Cluster IP ["+cluster.ip+"] not reachable while deleting AP ["+apSerialNumber+"] during bulk AP delete.");
										ResMessages.push("Cluster IP ["+cluster.ip+"] of AP ["+apSerialNumber+"] not reachable");
										error = true;
										callback(error ,ResMessages);	
									}else{
										logger.info("Error while deleting AP ["+apSerialNumber+"] during bulk ap delete.");
										ResMessages.push(" Error : "+reason);
										error = true;
										callback(error ,ResMessages);
									}
								});
							}else{
								APModel.remove({apserial: apSerialNumber}, function (err) {
								  if(err){ 
										logger.info(dbErrorMessage);
										logger.info(err);
										ResMessages.push(dbErrorMessage);
										error = true;
										callback(error ,ResMessages);
									}else{
										if(ApInfo.clusterid){
											view.populateNumberOfAPsPerCluster(ApInfo.clusterid, function(error, result){
												if(error){
													logger.info("Error while populating number of APs in cluster during bulk ap delete.");
													ResMessages.push(" AP ["+apSerialNumber+"] deleted successfully, but error while populating number of APs in cluster :"+result);
													error = false;
													callback(error ,ResMessages);
												}else{
													error = false;
													callback(error ,ResMessages);
												}
											});		
										}else{
											error = false;
											callback(error ,ResMessages);
										}									
									}
								});
							}
						}
					});	
				}else{
					APModel.remove({apserial: apSerialNumber}, function (err) {
					  if(err){ 
							logger.info(dbErrorMessage);
							logger.info(err);
							error = true;
							callback(error ,ResMessages);
						}else{
							error = false;
							callback(error ,ResMessages);
						}
					});
				}					
			}else{
				logger.info("AP ["+apSerialNumber+"] not found during bulk ap delete.");
				ResMessages.push("AP ["+apSerialNumber+"] not found");
				error = true;
				callback(error ,ResMessages);
			}
		});	
		
	} catch(e){
		logger.info("Exception while deleting AP ["+apSerialNumber+"] : "+e);
		ResMessages.push("Exception while deleting AP ["+apSerialNumber+"]");
		error = true;
		callback(error ,ResMessages);
	}
}


exports.bulkapupload = async(ApPayload, loopCount, loggedInUser, ResMessages) => {
	var view = this;
	return new Promise(function(resolve,reject){
		try{
			var ApExists = false;
			var clusterId = ""; 
			var ApZoneName = "";			
			var ApZoneId = "";			
			var currentDate = new Date();
			
			if(ApPayload.apname == "" || ApPayload.apname == undefined){
				var APName = "";
			}else{
				var APName = ApPayload.apname;
			}
			if(ApPayload.clusterip == "" || ApPayload.clusterip == undefined){
				var ClusterIp = "";
			}else{
				var ClusterIp = ApPayload.clusterip;
			}
			if(ApPayload.zonename != "" && ApPayload.zonename != undefined){
				ApZoneName = ApPayload.zonename;
			}
			
			//check if AP already exists
			APModel.findOne({ apserial: ApPayload.apserial }, function(err, ap) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					ResMessages.push(dbErrorMessage);
					error = true;
					resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
				}else if(ap && (ap.apserial == ApPayload.apserial)){
					logger.info("Bulk AP Upload : AP Serial number ["+ApPayload.apserial+"] already exists")
					ResMessages.push("AP Serial number ["+ApPayload.apserial+"] already exists");
					error = true;
					resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
				}else{
					if(ClusterIp == ""){
						var searchString = '{"defaultcluster":true}';
					}else{
						var searchString = '{"ip":"'+ClusterIp+'"}';
					}
					searchString = JSON.parse(searchString);
					//check if cluster Ip is configured or not
					ClusterModel.findOne(searchString, function(err, cluster) {
						if(err){
							logger.info(dbErrorMessage);
							logger.info(err);
							ResMessages.push(dbErrorMessage);
							error = true;
							resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});									
						}else if(cluster){						
							clusterId = cluster._id; 
							clusterName = cluster.name; 
							if(ApZoneName != ""){
								ZoneList = cluster.zones;
								ZoneList.forEach(function(zone) {
									if(zone.name == ApZoneName){
										ApZoneId = zone.id;
									}
								});
							}
							if(ApZoneId == "" && ApZoneName != ""){
								logger.info("Bulk AP Upload : Zone name ["+ApZoneName+"] not found in cluster ["+clusterName+"] when adding AP ["+ApPayload.apserial+"]")
								ResMessages.push("Zone name ["+ApZoneName+"] not found when adding AP ["+ApPayload.apserial+"] in cluster ["+clusterName+"]");
								error = true;
								resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
							}else{
								if(ApZoneName != ""){
									var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
									promiseCall = CommonClusterObj.login();
									promiseCall.then(function (result) {														
											return CommonClusterObj.AddAp(APName, ApPayload.apserial, ApZoneId, "Unlocked");
									})
									.then(function (result) {
										result = JSON.parse(result);
										if(result.success !== false){
											let connObj = CommonClusterObj.connObj
											let clusterAPState = connObj.is35orLater() ? 'Offline' : 'Flagged';
											var newAP = new APModel({ apserial: ApPayload.apserial, clusterid : cluster._id, clustername : cluster.name, mac: "", apname: APName, model: '', ip: '', zonename: ApPayload.zonename, zoneid: ApZoneId, connectionstate:'Provisioned', configmethod: "PROVISIONED", cds_cluster_state: 'PREPROVISIONED', clusterapstate : clusterAPState, username: loggedInUser, lastsynchtime : currentDate });
											newAP.save(function (err) {
											  if (err){
												logger.info(dbErrorMessage);
												logger.info(err);
												ResMessages.push(dbErrorMessage);
												error = true;
												resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
											  } else {
												 view.populateNumberOfAPsPerCluster(cluster._id, function(error, result){
													if(error){
														ResMessages.push("AP ["+ApPayload.apserial+"] added to zone successfully, but error while populating number of APs in cluster :"+result);
														error = false;
														resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
													}else{
														logger.info("Bulk AP Upload : AP ["+ApPayload.apserial+"] added to zone successfully")
														//ResMessages.push("AP ["+ApPayload.apserial+"] added to zone successfully");
														error = false;
														resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
													}
												});
											  }								   
											});	
										}else{
											logger.info("Bulk AP Upload : Smart zone API error while adding AP ["+ApPayload.apserial+"]")
											logger.error(result)					
											if(result.error.message){
												ResMessages.push("Error while adding AP ["+ApPayload.apserial+"] :"+result.error.message);
												error = true;
												resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
											}else{
												ResMessages.push("Error while adding AP ["+ApPayload.apserial+"] :"+result);
												error = true;
												resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
											}
										}
									})				
									.catch(function (reason) {
										logger.info("Bulk AP Upload : Smart zone API error while adding AP ["+ApPayload.apserial+"]")
										if(reason == "Unreachable"){
											logger.error("Cluster IP ["+cluster.ip+"] is not reachable")	
											ResMessages.push("Cluster IP of AP ["+ApPayload.apserial+"] is not reachable");
											error = true;
											resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": true });
										}else{
											logger.error(reason)	
											ResMessages.push("Error while adding AP ["+ApPayload.apserial+"] :"+reason);
											error = true;
											resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
										}
									});
								}else{
									var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
									promiseCall = CommonClusterObj.login();
									promiseCall.then(function (result) {														
										var newAP = new APModel({ apserial: ApPayload.apserial, clusterid : cluster._id, clustername : cluster.name, mac: "", apname: APName, model: "", zonename: "", zoneid: "", connectionstate: "", configmethod: "PROVISIONED", username: loggedInUser});
										newAP.save(function (err) {
										  if (err){
											logger.info(dbErrorMessage);
											logger.info(err);
											ResMessages.push(dbErrorMessage);
											error = true;
											resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
										  } else {
											 view.populateNumberOfAPsPerCluster(cluster._id, function(error, result){
												if(error){
													ResMessages.push("AP ["+ApPayload.apserial+"] added to cluster successfully, but error while populating number of APs in cluster :"+result);
													error = false;
													resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
												}else{
													logger.info("Bulk AP Upload : AP ["+ApPayload.apserial+"] added to cluster successfully")
													//ResMessages.push("AP ["+ApPayload.apserial+"] added to cluster successfully");
													error = false;
													resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
												}
											});
										  }								   
										});	
									})				
									.catch(function (reason) {
										logger.info("Bulk AP Upload : Smart zone API error while adding AP ["+ApPayload.apserial+"]")
										if(reason == "Unreachable"){
											logger.error("Cluster IP ["+cluster.ip+"] is not reachable")	
											ResMessages.push("Cluster IP of AP ["+ApPayload.apserial+"] is not reachable");
											error = true;
											resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": true});
										}else{
											logger.error(reason)	
											ResMessages.push("Error while adding AP ["+ApPayload.apserial+"] :"+reason);
											error = true;
											resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
										}
									});
								}
									
							}							
						}else{
							if(ClusterIp == ""){
								logger.info("Bulk AP Upload : Default cluster not found when adding AP ["+ApPayload.apserial+"]")
								ResMessages.push("Default cluster not found when adding AP ["+ApPayload.apserial+"]");
								error = true;
								resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
							}else{
								logger.info("Bulk AP Upload : Cluster IP not found when adding AP ["+ApPayload.apserial+"]")
								ResMessages.push("Cluster IP not found when adding AP ["+ApPayload.apserial+"]");
								error = true;
								resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
							}
						}
					});
				}
			});		
			
		} catch(e){
			logger.info("Bulk AP Upload : Exception occur when adding AP ["+ApPayload.apserial+"]")
			logger.error(e);
			ResMessages.push("Exception while adding AP ["+ApPayload.apserial+"]");
			error = true;
			resolve({"error" : error ,"ResMessages" : ResMessages, "isUnreachable": false});
		}
	})
}

exports.deleteclusteraps = function(ApInfo, deleteFromVsz, ResMessages, callback){
	try{
		var view = this;
		var apSerialNumber = ApInfo.apserial;
		ClusterModel.findOne({_id: ApInfo.clusterid}, function (err, cluster) {
			if(err){					
				logger.info(dbErrorMessage);
				logger.info(err);
				ResMessages.push(dbErrorMessage);
				error = true;
				callback(error ,ResMessages);
			}else if(!cluster){
				logger.info("Delete Cluster AP : Cluster IP not found for AP ["+apSerialNumber+"]")
				ResMessages.push("Cluster IP not found of AP Serial Number : "+apSerialNumber);
				error = true;
				callback(error ,ResMessages);
			}else{
				if(ApInfo.cds_cluster_state != "NOTINCLUSTER" && ApInfo.zoneid != "" && (deleteFromVsz === true || deleteFromVsz == "true")){
					var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
					promiseCall = CommonClusterObj.login();
					promiseCall.then(function (result) {
						if(ApInfo.zoneid != ""){
							return CommonClusterObj.deleteAp(ApInfo.apserial);
						}else{
							return '{"success":true}';
						}
						
					})
					.then(function (result) {
						result = JSON.parse(result);
						if(result.success){
							APModel.remove({apserial: apSerialNumber}, function (err) {
							  if(err){ 
									logger.info(dbErrorMessage);
									logger.info(err);
									ResMessages.push(dbErrorMessage);
									error = true;
									callback(error ,ResMessages);
								}else{
									view.populateNumberOfAPsPerCluster(ApInfo.clusterid, function(error, result){
										if(error){
											ResMessages.push(" AP ["+apSerialNumber+"] deleted successfully, but error while populating number of APs in cluster :"+result);
											error = false;
											callback(error ,ResMessages);
										}else{
											ResMessages.push("AP ["+apSerialNumber+"] deleted successfully");
											error = false;
											callback(error ,ResMessages);
										}
									});			
								}
							});
						}else{
							logger.info("Delete Cluster AP : Smart zone API error occur when deleting AP ["+apSerialNumber+"]")
							logger.error(result)
							ResMessages.push("Error ["+apSerialNumber+"] : "+result.message);
							error = true;
							callback(error ,ResMessages);
						}
					})  
					.catch(function (reason) {
						logger.info("Delete Cluster AP : Smart zone API error occur when deleting AP ["+apSerialNumber+"]")
						if(reason == "Unreachable"){
							logger.error("Cluster IP ["+cluster.ip+"] is not reachable")
							ResMessages.push("Cluster IP ["+cluster.ip+"] of AP ["+apSerialNumber+"] not reachable");
							error = true;
							callback(error ,ResMessages);	
						}else{
							logger.error(reason)
							ResMessages.push(" Error : "+reason);
							error = true;
							callback(error ,ResMessages);
						}
					});
				}else{
					APModel.remove({apserial: apSerialNumber}, function (err) {
						if(err){ 
							logger.info(dbErrorMessage);
							logger.info(err);
							ResMessages.push(dbErrorMessage);
							error = true;
							callback(error ,ResMessages);
						}else{
							view.populateNumberOfAPsPerCluster(ApInfo.clusterid, function(error, result){
								if(error){
									ResMessages.push(" AP ["+apSerialNumber+"] deleted successfully, but error while populating number of APs in cluster :"+result);
									error = false;
									callback(error ,ResMessages);
								}else{
									ResMessages.push("AP ["+apSerialNumber+"] deleted successfully");
									error = false;
									callback(error ,ResMessages);
								}
							});			
						}
					});
				}
			}
		});	
		
	} catch(e){
		logger.info("Delete Cluster AP : Exception occur when deleting AP ["+apSerialNumber+"]")
		logger.error(e);
		ResMessages.push("Exception while deleting AP ["+apSerialNumber+"]");
		error = true;
		callback(error ,ResMessages);
	}
}

exports.createAuditLog = function(data){
	try{
		var view = this;
		var message = '';
		if(data){
			var sourceip = data.sourceip
			var action = data.action
			var resource = data.resource
			var description = data.description
			var username = data.username
			if(!sourceip){
				message = "Activity source IP is missing in the request"
				error = true;
				logger.error("Activity Logs : Activity source IP is missing in the request while logging activity")
				return message
			}else if(!action){
				message = "Activity action is missing in the request"
				error = true;
				logger.error("Activity Logs : Activity action is missing in the request while logging activity")
				return message
			}else if(!resource){
				message = "Activity resource is missing in the request"
				error = true;
				logger.error("Activity Logs : Activity resource is missing in the request while logging activity")
				return message
			}else if(!description){
				message = "Activity action description is missing in the request"
				error = true;
				logger.error("Activity Logs : Activity action description is missing in the request while logging activity")
				return message
			}else if(!username){
				message = "Activity username is missing in the request"
				error = true;
				logger.error("Activity Logs : Activity username is missing in the request while logging activity activity")
				return message
			}else{
				var queryCount = AuditTrailModel.count({});
				queryCount.exec(function (err, activitiesCount) {
				  if(err){
						logger.info("Activity Logs : DB error when checking total number of activity logs")
						logger.error(err)
						return false
					}else if(activitiesCount >= 10000){
						AuditTrailModel.findOne({}).sort({activitytime: 1}).limit(1).exec(function(err, oldestEntry) {
							if(err){
								logger.info(dbErrorMessage);
								logger.info(err);
								return false
							}else{
								let activityId = oldestEntry._id
								AuditTrailModel.remove({_id: activityId}, function (err) {
									if(err){ 
										logger.info(dbErrorMessage);
										logger.info(err);
										return false
									}
								})
							}
						})
					}
				})
				var newAuditLog = new AuditTrailModel({ sourceip: sourceip, action : action, resource : resource, description: description, username: username});
				newAuditLog.save(function (err) {
					if (err){
						logger.info(dbErrorMessage);
						logger.info(err);
						message = dbErrorMessage;
						error = true;
						//callback(error ,message);
						return message
					}else{
						logger.info("Activity log created successfully");
						message = "Activity log created successfully";
						error = false;
						//callback(error ,message);
						return true
					}
				})
			}
		}else{
			logger.info("Activity Logs : Invalid Activity log payload data provided when creating activity logs")
			logger.error(data)
			message = "Invalid Activity log data";
			error = true;
			//callback(error ,message);
			return message
		}
	} catch(e){
		logger.info("Activity Logs : Exception when creating activity logs")
		logger.error(data)
		message = "Exception while creating activity log";
		error = true;
		//callback(error ,message);
		return message
	}
}
