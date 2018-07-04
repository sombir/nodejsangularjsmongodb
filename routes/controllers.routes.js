var express = require('express');
var request = require("request");
var randomstring = require("randomstring");
var router = express.Router();
var app = express();
var logger = require("../config/logger.config");
var ClusterModel = require('../models/ClusterModel');
var APModel = require('../models/AccessPointModel');
var DataCenterModel = require('../models/DataCenterModel');
var CommonService = require('./common.service');
var CommonCluster = require('./CommonCluster');
var backprocess = require('../szcomm/backprocess');
var aputils = require('../utils/aputils');

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

//get single controller details 
router.get('/controllers/:IPAddress', function(req, res, next) {
	logger.info("Get one cluster details API start from here");
	try{
		var controllerIPAddress = req.params.IPAddress;
		if(controllerIPAddress == ""){
			res.json({
				success: false,
				message: 'Cluster IP Address missing in the request.'
			});
		}else{
			ClusterModel.findOne({ $or: [{ ip: controllerIPAddress }, { name: controllerIPAddress } ]}, function(err, controller) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else{
					return res.json({
						success: true,
						data: controller
					});
				}
			});	
		}
	} catch(e){
		logger.info("Get one Cluster API executed catch : "+e);
		return res.json({
			success: false,
			message: "Get one Cluster API Exception: "+e
		});
	}
});


//get list of controllers 
router.get('/controllers', function(req, res, next) {
	logger.info("Get list of clusters API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 0;
		}else{
			var numberofrows = parseInt(req.query.numberofrows);
		}
		if(!req.query.sortby){			
			var sortByColumn = '_id';
		}else{
			var sortByColumn = req.query.sortby;
		}
		if(!req.query.sortorder){			
			var sortOrder = 1;
		}else{
			if(req.query.sortOrder != 1 && req.query.sortorder != -1){
				var sortOrder = 1;
			}else{
				var sortOrder = req.query.sortorder;
			}
		}
		var sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if(!req.query.search){
			var searchText = "";
		}else{
			var searchText = req.query.search;
		}
		var output = '{"totalCount":0,"hasMore":false,"list":[]}';
		output = JSON.parse(output);
		var searchTextRegExp = new RegExp(searchText,'i');
		
		//if filter for status then convert the search string in integer
		if(searchText == "1" || searchText == "0"){
			searchText = parseInt(searchText);
		}
		
		//check applied filter is integer 1 or 0, if yes then search for status otherwise not status search 
		if(searchText == 0 || searchText == 1){
			//build count query with status search 
			var queryCount = ClusterModel.count({ $or: [ {ip: searchTextRegExp}, {name: searchTextRegExp}, {loginid: searchTextRegExp}, {tag: searchTextRegExp}, {managementips: searchTextRegExp}, {controllerips: searchTextRegExp}, {status : searchText} ]});
			
			//build filter query with status search 
			var queryFilter = ClusterModel.find({ $or: [ {ip: searchTextRegExp}, {name: searchTextRegExp}, {loginid: searchTextRegExp}, {tag: searchTextRegExp}, {managementips: searchTextRegExp}, {controllerips: searchTextRegExp}, {status : searchText} ]}, {_id: 0, password: 0}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		}else{
			//build count query without status search 
			var queryCount = ClusterModel.count({ $or: [ {ip: searchTextRegExp}, {name: searchTextRegExp}, {loginid: searchTextRegExp}, {tag: searchTextRegExp}, {managementips: searchTextRegExp}, {controllerips: searchTextRegExp} ]});
			
			//build filter query without status search 
			var queryFilter = ClusterModel.find({ $or: [ {ip: searchTextRegExp}, {name: searchTextRegExp}, {loginid: searchTextRegExp}, {tag: searchTextRegExp}, {managementips: searchTextRegExp}, {controllerips: searchTextRegExp} ]}, {_id: 0, password: 0}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		}
		//Query to find total using filter if any
		queryCount.exec(function (err, controllerCount) {
		  if(err){
			  	logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = controllerCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, controllers) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = (startindex-1)*numberofrows;
						var allRows = controllers.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = controllers;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("Get list of clusters API executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of clusters API Exception: "+e
		});
	}
});

//create new controller 
router.post('/controllers', function(req, res, next) {
	logger.info("Create cluster API start from here");
	try{
		var controlIpCds = [];
		var managementIpCds = [];
		var zonesCds = [];
		var modelCds = "";
		var versionCds = "";
		var licenseCds = "";
		var controllerFound = false;
		var ImportClusterAps = false;
		var isDefaultCluster = false;
		var controllerName = "";
		var currentDate = new Date();
		var sourceip = aputils.getClientIp(req);
		var action = "Create"
		var resource = "Cluster"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		if(req.body && (req.body.ip == "" || req.body.ip == undefined)){
			res.json({
				success: false,
				message: 'Cluster IP Address is missing in the request.'
			});
		}else if(req.body && (req.body.loginid == "" || req.body.loginid == undefined)){
			res.json({
				success: false,
				message: "Cluster loginid is missing in the request."
			});
		}else if(req.body && (req.body.password == "" || req.body.password == undefined)){
			res.json({
				success: false,
				message: "Cluster password is missing in the request."
			});
		}else{
			if(req.body && (req.body.name == "" || req.body.name == undefined)){
				controllerName = "default-name-"+randomstring.generate(7);
			}else{
				controllerName = req.body.name;
			}
			if(req.body && (req.body.importaps != "" || req.body.importaps != undefined)){
				ImportClusterAps = req.body.importaps;
			}
			if(req.body && (req.body.defaultcluster != "" || req.body.defaultcluster != undefined)){
				isDefaultCluster = req.body.defaultcluster;
			}
			//check if controller ip or name already exists
			ClusterModel.findOne({ $or: [ { ip: req.body.ip }, { name: controllerName }, { managementips : { $in : [req.body.ip]} } ] }, function(err, cluster) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					}); 
				}else if(cluster && (cluster.ip == req.body.ip)){
					res.json({
						success: false,
						message: 'Cluster IP already exists.'
					});
				}else if(cluster && (cluster.name == controllerName)){
					res.json({
						success: false,
						message: 'Cluster name already exists.'
					});
				}else if(cluster){
					res.json({
						success: false,
						message: "Cluster IP already exists in ["+cluster.name+"] Cluster's management IPs list"
					});
				}else{	
					var CommonClusterObj = new CommonCluster(req.body.ip, req.body.loginid, req.body.password);	
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
								vSZController.controlIp ? controlIpCds.push( vSZController.controlIp ) : ''
								vSZController.controlIpv6 ? controlIpCds.push( vSZController.controlIpv6 ) : ''
								vSZController.managementIp ? managementIpCds.push( vSZController.managementIp ) : ''
								vSZController.managementIpv6 ? managementIpCds.push( vSZController.managementIpv6 ) : ''
								controllerFound = true;
						});
						if(!controllerFound){
							res.json({
								success: false,
								message: 'Cluster IP not configured.'
							});
						}else{
							if(isDefaultCluster === true || isDefaultCluster == "true"){
								CommonService.checkIfDefaultClusterExist(function(error, result){
									if(error){
										return res.json({
											success: false,
											message: 'Error :'+result
										});
									}else if(result != ""){
										ClusterModel.findOneAndUpdate({ _id: result }, { defaultcluster: false, last_modified: currentDate }, function(err, updateDefaultCluster) {
											if(err){
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											}
										});
									}
								});
							}
							var newController = new ClusterModel({ ip: req.body.ip, name : controllerName, loginid: req.body.loginid, password: req.body.password, controllerips: controlIpCds , managementips: managementIpCds, zones:zonesCds, apsimported : ImportClusterAps, status: 1, tag:req.body.tag,username:req.decoded.username, defaultcluster : isDefaultCluster, lastsynchtime : currentDate });
							newController.save(function (err,newClusterInfo) {
							  if (err){
								 logger.info(dbErrorMessage);
								 logger.info(err);
								 return res.json({
									success: false,
									message: dbErrorMessage
								 });
							  } else {
								var description = 'Cluster ['+controllerName+'] created';
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)								
								backprocess.getInventoryForCluster(req.body.ip, function(error, result){
									if(ImportClusterAps === true || ImportClusterAps == "true"){
										 CommonService.populateApDataWhenClusterAdded(newClusterInfo.ip,newClusterInfo.loginid,newClusterInfo.password,newClusterInfo._id,newClusterInfo.name, newClusterInfo.zones, req.decoded.username,function(message, result){
											if(result){
												var description = "Cluster ["+controllerName+"] APs imported successfully" 
												auditLogData.description = description
												CommonService.createAuditLog(auditLogData)
												CommonService.populateNumberOfAPsPerCluster(newClusterInfo._id, function(error, result){
													if(error){
														return res.json({
															success: true,
															message: "Cluster created successfully. ["+message+"], but error while populating number of APs"+result 
														});
													}else{
														return res.json({
															success: true,
															message: "Cluster created successfully. ["+message+"]"
														});
													}
												});
											}else{
												var description = "Error while importing ["+controllerName+"] cluster APs data. ["+message+"]"
												auditLogData.description = description
												CommonService.createAuditLog(auditLogData)
												return res.json({
													success: true,
													message: "Cluster created successfully. ["+message+"]"
												});
											}
										 });
									}else{
										logger.info("APs data not populated, ImportClusterAps : "+ImportClusterAps);
										return res.json({
											success: true,
											message: "Cluster created successfully."
										});
									}
								})
							  }								   
							});	
						}				
					})  
					.catch(function (reason) {
						if(reason == "Unreachable"){
							var description = "Cluster ["+controllerName+"] created, But not Reachable"
							auditLogData.description = description
							CommonService.createAuditLog(auditLogData)
							if(isDefaultCluster === true || isDefaultCluster == "true"){
								CommonService.checkIfDefaultClusterExist(function(error, result){
									if(error){
										return res.json({
											success: false,
											message: 'Error :'+result
										});
									}else if(result != ""){
										ClusterModel.findOneAndUpdate({ _id: result }, { defaultcluster: false, last_modified: currentDate }, function(err, updateDefaultCluster) {
											if(err){
												logger.info(dbErrorMessage);
								 				logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											}
										});
									}
								});
							}
							var newController = new ClusterModel({ ip: req.body.ip, name : controllerName, loginid: req.body.loginid, password: req.body.password, controllerips: controlIpCds , managementips: managementIpCds, zones:zonesCds, apsimported : ImportClusterAps, status: 0, tag:req.body.tag,username:req.decoded.username, defaultcluster : isDefaultCluster});
							newController.save(function (err, info) {
							  if (err){
								logger.info(dbErrorMessage);
								logger.info(err); 
								return res.json({
									success: false,
									message: dbErrorMessage
								 });
							  } else {
								 logger.info("Cluster created, But not Reachable");
								 return res.json({
									success: true,
									message: "Cluster created, But not Reachable."
								 });
							  }								   
							});	
						}else{								
							var description = "Error while creating cluster ["+controllerName+"]"
							auditLogData.description = description
							CommonService.createAuditLog(auditLogData)
							res.json({
								success: false,
								message: "Error : "+reason
							});
						}
					});
				}					
			});
		}
	} catch(e){
		logger.info("Create cluster API Exception : "+e);
		return res.json({
			success: false,
			message: "Create cluster API Exception: "+e
		});
	}
});


//update controller /updateController/:IPAddress
router.put('/controllers/:IPAddress', function(req, res, next) {
	logger.info("Update cluster API start from here");
	try{
		var controlIpCds = [];
		var managementIpCds = [];
		var zonesCds = [];
		var modelCds = "";
		var versionCds = "";
		var licenseCds = "";
		var controllerFound = false;
		var ImportClusterAps = false;
		var ImportClusterApsFlag = false;
		var isDefaultCluster = false;
		var controllerName = "";
		var currentDate = new Date();
		var controllerIp = req.params.IPAddress;
		var sourceip = aputils.getClientIp(req);
		var action = "Edit"
		var resource = "Cluster"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		if(req.body && (req.body.ip == "" || req.body.ip == undefined)){
			res.json({
				success: false,
				message: 'Cluster IP Address is missing in the request.'
			});
		}else if(req.body && (req.body.loginid == "" || req.body.loginid == undefined)){
			res.json({
				success: false,
				message: "Cluster loginid is missing in the request."
			});
		}else if(req.body && (req.body.password == "" || req.body.password == undefined)){
			res.json({
				success: false,
				message: "Cluster password is missing in the request."
			});
		}else{
			if(req.body && (req.body.name == "" || req.body.name == undefined)){
				controllerName = "default-name-"+randomstring.generate(7);
			}else{
				controllerName = req.body.name;
			}
			if(req.body && (req.body.importaps != "" || req.body.importaps != undefined)){
				ImportClusterAps = req.body.importaps;
			}
			if(req.body && (req.body.defaultcluster != "" || req.body.defaultcluster != undefined)){
				isDefaultCluster = req.body.defaultcluster;
			}
			
			//check if controller ip or name already exists
			ClusterModel.findOne({ ip: controllerIp }, function(err, cluster) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err); 
					return res.json({
						success: false,
						message: dbErrorMessage
					}); 
				}else if(!cluster){
					res.json({
						success: false,
						message: 'Cluster IP not found.'
					});
				}else{
					if(req.body && (req.body.defaultcluster == undefined)){
						isDefaultCluster = cluster.defaultcluster;
					}
					ClusterModel.findOne({ $or: [{ ip: req.body.ip },{ name: controllerName },{ managementips : { $in : [req.body.ip]} }], ip : { $ne : controllerIp} }, function(err, clusterOne){
						if(err){
							logger.info(dbErrorMessage);
							logger.info(err); 
							return res.json({
								success: false,
								message: dbErrorMessage
							}); 
						}else if(clusterOne && (clusterOne.ip == req.body.ip)){
							res.json({
								success: false,
								message: 'Cluster IP already exists.'
							});
						}else if(clusterOne && (clusterOne.name == controllerName)){
							res.json({
								success: false,
								message: 'Cluster name already exists.'
							});
						}else if(clusterOne){
							res.json({
								success: false,
								message: "Cluster IP already exists in ["+clusterOne.name+"] cluster's management IPs list"
							});
						}else{
							var CommonClusterObj = new CommonCluster(req.body.ip, req.body.loginid, req.body.password);	
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
										vSZController.controlIp ? controlIpCds.push( vSZController.controlIp ) : ''
										vSZController.controlIpv6 ? controlIpCds.push( vSZController.controlIpv6 ) : ''
										vSZController.managementIp ? managementIpCds.push( vSZController.managementIp ) : ''
										vSZController.managementIpv6 ? managementIpCds.push( vSZController.managementIpv6 ) : ''
										controllerFound = true;
								});
								if(!controllerFound){
									res.json({
										success: false,
										message: 'Cluster IP not configured.'
									});
								}else{
									if(isDefaultCluster === true || isDefaultCluster == "true"){
										CommonService.checkIfDefaultClusterExist(function(error, result){
											if(error){
												return res.json({
													success: false,
													message: 'Error :'+result
												});
											}else if(result != "" && !result.equals(cluster._id)){
												ClusterModel.findOneAndUpdate({ _id: result }, { defaultcluster: false, last_modified: currentDate }, function(err, updateDefaultCluster) {
													if(err){
														logger.info(dbErrorMessage);
														logger.info(err);
														return res.json({
															success: false,
															message: dbErrorMessage
														});
													}
												});
											}
										});
									}
									if(cluster.apsimported){
										ImportClusterApsFlag = true;
									}else if(ImportClusterAps === true || ImportClusterAps == "true"){
										ImportClusterApsFlag = true;
									}									
									ClusterModel.findOneAndUpdate({ ip: controllerIp }, { ip: req.body.ip, name : controllerName, loginid: req.body.loginid, password: req.body.password, controllerips: controlIpCds , managementips: managementIpCds, zones:zonesCds, apsimported : ImportClusterApsFlag, status: 1, tag:req.body.tag,username:req.decoded.username, defaultcluster : isDefaultCluster, last_modified: currentDate, lastsynchtime : currentDate }, function(err, updatedCluster) {
										if(err){
											logger.info(dbErrorMessage);
											logger.info(err);
											return res.json({
												success: false,
												message: dbErrorMessage
											});
										}else{
											var description = 'Cluster ['+controllerName+'] updated successfully';
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
											backprocess.getInventoryForCluster(req.body.ip, function(error, result){
												if(ImportClusterAps === true || ImportClusterAps == "true"){
													CommonService.populateApDataWhenClusterAdded(req.body.ip,req.body.loginid,req.body.password,cluster._id, controllerName, zonesCds, req.decoded.username,function(message, result){
														if(result){
															var description = "Cluster ["+controllerName+"] APs imported successfully" 
															auditLogData.description = description
															CommonService.createAuditLog(auditLogData)
															CommonService.populateNumberOfAPsPerCluster(cluster._id, function(error, result){
																if(error){
																	logger.info('CommonService.populateNumberOfAPsPerCluster error :'+error);
																	return res.json({
																		success: true,
																		message: "Cluster updated successfully. ["+message+"], but error while populating number of APs : "+result 
																	});
																}else{
																	return res.json({
																		success: true,
																		message: "Cluster updated successfully. ["+message+"]"
																	});
																}
															});
														}else{
															var description = "Error while importing ["+controllerName+"] cluster APs data. ["+message+"]"
															auditLogData.description = description
															CommonService.createAuditLog(auditLogData)
															return res.json({
																success: true,
																message: "Cluster updated successfully. ["+message+"]"
															});
														}
													 });
												}else{
													return res.json({
														success: true,
														message: "Cluster updated successfully."
													});
												}
											})											
										}
									});
								}				
							})  
							.catch(function (reason) {
								if(reason == "Unreachable"){
									var description = "Cluster ["+controllerName+"] updated successfully, But not Reachable"
									auditLogData.description = description
									CommonService.createAuditLog(auditLogData)
									if(isDefaultCluster === true || isDefaultCluster == "true"){
										CommonService.checkIfDefaultClusterExist(function(error, result){
											if(error){
												return res.json({
													success: false,
													message: 'Error :'+result
												});
											}else if(result != "" && !result.equals(cluster._id)){
												ClusterModel.findOneAndUpdate({ _id: result }, { defaultcluster: false, last_modified: currentDate }, function(err, updateDefaultCluster) {
													if(err){
														logger.info(dbErrorMessage);
														logger.info(err);
														return res.json({
															success: false,
															message: dbErrorMessage
														});
													}
												});
											}
										});
									}
									ClusterModel.findOneAndUpdate({ ip: controllerIp }, { ip: req.body.ip, name : controllerName, loginid: req.body.loginid, password: req.body.password, status: 0, tag:req.body.tag, username:req.decoded.username, defaultcluster : isDefaultCluster, last_modified: currentDate}, function(err, updatedCluster) {
										if(err){
											logger.info(dbErrorMessage);
											logger.info(err);
											return res.json({
												success: false,
												message: dbErrorMessage
											});
										}else{
											return res.json({
												success: true,
												message: "Cluster updated successfully. But not reachable"
											});
										}
									});
								}else{								
									var description = "Error while updating cluster ["+controllerName+"]"
									auditLogData.description = description
									CommonService.createAuditLog(auditLogData)
									res.json({
										success: false,
										message: "Error : "+reason
									});
								}
							});
						}
					});
				}					
			});
		}
	} catch(e){
		logger.info("Create Cluster catch : "+e);
		return res.json({
			success: false,
			message: "Create Cluster Exception: "+e
		});
	}
});

//delete controller api /deleteController/:Name
router.delete('/controllers/:IPAddress', function(req, res, next) {
	logger.info("Delete cluster API start from here");
	try{
		var loopStop = false;
		var sourceip = aputils.getClientIp(req);
		var action = "Edit"
		var resource = "Cluster"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		if(req.body && (req.params.IPAddress == "" || req.params.IPAddress == undefined)){
			res.json({
				success: false,
				message: 'Cluster IP address missing in the request.'
			});
		}else{
			ClusterModel.remove({ip: req.params.IPAddress}, function (err) {
			  	if(err){ 
					logger.info(dbErrorMessage);
					logger.info(err);
					var description = "Error while deleting cluster ["+req.params.IPAddress+"] : "+err
					auditLogData.description = description
					CommonService.createAuditLog(auditLogData)
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else{
					var description = "Cluster ["+req.params.IPAddress+"] deleted successfully"
					auditLogData.description = description
					CommonService.createAuditLog(auditLogData)
					return res.json({
						success: true,
						message: "Cluster deleted successfully"
					});					
				}
			});
		}
	} catch(e){
		logger.info("delete Cluster executed catch : "+e);
		var description = "Error while deleting cluster ["+req.params.IPAddress+"] : "+e
		auditLogData.description = description
		CommonService.createAuditLog(auditLogData)
		return res.json({
			success: false,
			message: "Delete Cluster Exception: "+e
		});
	}
});

//get cluster status api by cluster IP or cluster name /clusterstatus/:cluster
router.get('/clusterstatus/:cluster', function(req, res, next) {
	logger.info("Get cluster status API start from here");
	try{
		var clusterParams = req.params.cluster;
		if(clusterParams == "" || clusterParams == undefined){
			return res.json({
				success: false,
				message: 'Cluster IP or name is missing in the request.'
			});
		}else{
			CommonService.getClusterStatus(clusterParams, function(error, result){
				if(error){
					return res.json({
						success: false,
						message: result
					});
				}else{
					return res.json({
						success: true,
						clusterStatus: result
					});
				}
			});		
		}
	} catch(e){
		logger.info("get cluster status executed catch : "+e);
		return res.json({
			success: false,
			message: "Get cluster status Exception: "+e
		});
	}
});

//delete cluster aps /deleteclusteraps/:cluster/:deletefromSZ?
router.delete('/deleteclusteraps/:cluster/:deletefromSZ?', function(req, res, next) {
	logger.info("delete cluster aps API start from here");
	try{
		var clusterParams = req.params.cluster;
		var deleteFromVsz = false;
		var sourceip = aputils.getClientIp(req);
		var action = "Delete"
		var resource = "Cluster APs"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		if(clusterParams == "" || clusterParams == undefined){
			return res.json({
				success: false,
				message: 'Cluster IP or name is missing in the request.'
			});
		}else{
			APModel.find({ $or: [ { clusterid: clusterParams }, { clustername: clusterParams } ] }, function(err, apslist) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else if(!apslist.length){
					logger.info('No AP found to delete in this cluster : '+apslist);
					return res.json({
						success: false,
						message: "No AP found in cluster"
					});
				}else{
					if(req.params.deletefromSZ != "" || req.params.deletefromSZ != undefined){
						deleteFromVsz = req.params.deletefromSZ;
					}
					var loopCount = 0;
					var ApDeleteSuccess = 0;
					var ApDeleteFailed = 0;
					var ResMessages = [];
					var resmessage = ""; 
					apslist.forEach(function(apInfo) {
						CommonService.deleteclusteraps(apInfo, deleteFromVsz, ResMessages, function(error, result){
							if(error){
								ApDeleteFailed = ApDeleteFailed + 1;
								resmessage = ApDeleteSuccess+" APs deleted, "+ApDeleteFailed+" APs failed"; 
								loopCount = loopCount + 1;
								if(loopCount == apslist.length){
									auditLogData.description = resmessage
									CommonService.createAuditLog(auditLogData)
									return res.json({
										success: false,
										message: resmessage
									});
								}								
							}else{
								ApDeleteSuccess = ApDeleteSuccess + 1;
								resmessage = ApDeleteSuccess+" APs deleted, "+ApDeleteFailed+" APs failed"; 
								loopCount = loopCount + 1;
								if(loopCount == apslist.length){
									auditLogData.description = resmessage
									CommonService.createAuditLog(auditLogData)
									return res.json({
										success: true,
										message: resmessage
									});
								}
							}
						});	
					});
				}
			});	
		}
	} catch(e){
		logger.info("delete cluster aps executed catch : "+e);
		return res.json({
			success: false,
			message: "Delete cluster aps Exception: "+e
		});
	}
});

//Test controller connection 
router.post('/testconnection', function(req, res, next) {
	logger.info("Test cluster connection API start from here");
	try{
		var controllerName = "";
		var currentDate = new Date();
		if(req.body && (req.body.ip == "" || req.body.ip == undefined)){
			res.json({
				success: false,
				message: 'Cluster IP Address is missing in the request.'
			});
		}else if(req.body && (req.body.loginid == "" || req.body.loginid == undefined)){
			res.json({
				success: false,
				message: "Cluster loginid is missing in the request."
			});
		}else if(req.body && (req.body.password == "" || req.body.password == undefined)){
			res.json({
				success: false,
				message: "Cluster password is missing in the request."
			});
		}else{			
			var CommonClusterObj = new CommonCluster(req.body.ip, req.body.loginid, req.body.password);	
			promiseCall = CommonClusterObj.login();
			promiseCall.then(function (result) {
				return res.json({
					success: true,
					message: "Cluster ["+req.body.ip+"] is reachable from CDS"
				 });		
			})
			.catch(function (reason) {
				if(reason == "Unreachable"){
					 logger.info("Cluster ["+req.body.ip+"] is not reachable from CDS");
					 return res.json({
						success: false,
						message: "Cluster ["+req.body.ip+"] is not reachable from CDS"
					 });
				}else{								
					res.json({
						success: false,
						message: "Error : "+reason
					});
				}
			});
		}
	} catch(e){
		logger.info("Test Cluster connection catch : "+e);
		return res.json({
			success: false,
			message: "Test Cluster connection Exception: "+e
		});
	}
});

//Resolve dns name 
router.get('/dnsresolve/:domainname', async(req, res, next) => {
	logger.info("Resolve dns name API start from here");
	try{
		var controllerName = "";
		var currentDate = new Date();
		if(req.body && (req.params.domainname == "" || req.params.domainname == undefined)){
			return res.json({
				success: false,
				message: 'Domain name is missing in the request.'
			});
		}else{			
			logger.info("Now first trying to resolve dns for hostname from back process file : "+req.params.domainname)
			var dnsResult = await aputils.dnslookup(req.params.domainname);
			if(dnsResult && dnsResult.result && dnsResult.family){
				if(dnsResult.result){
					return res.json({
						success: true,
						message: dnsResult.result
					});
				}else{
					return res.json({
						success: false,
						message: "Host name DNS not resolved, please re-check the host name"
					});
				}
			}else{
				return res.json({
					success: false,
					message: "Host name DNS not resolved, please re-check the host name"
				});
			}
		}
	} catch(e){
		logger.info("Resolve dns name catch : "+e);
		logger.info(e);
		return res.json({
			success: false,
			message: "Host name DNS not resolved, please re-check the host name"
		});
	}
});

module.exports = router;