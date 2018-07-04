var express = require('express');
var request = require("request");
var jsonfile = require('jsonfile');
var router = express.Router();
var app = express();
var logger = require("../config/logger.config");
var APModel = require('../models/AccessPointModel');
var ClusterModel = require('../models/ClusterModel');
var TPModel = require('../models/TaskProgressModel');
var CommonCluster = require('./CommonCluster');
var CommonService = require('./common.service');
var aputils = require('../utils/aputils');

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

//get single AP details api /aps/:apserial
router.get('/aps/:apserial', function(req, res, next) {
	logger.info("Get single AP details API start from here");
	try{
		var APSerialNumber = req.params.apserial;
		if(APSerialNumber == ""){
			return res.json({
				success: false,
				message: 'AP serial number missing in the request.'
			});
		}else{
			APModel.findOne({ apserial: APSerialNumber }, function(err, ap) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else if(!ap){
					return res.json({
						success: false,
						message: 'AP not found.'
					});
				}else{
					return res.json({
						success: true,
						data: ap
					});
				}
			});	
		}
	} catch(e){
		logger.info("Get AP : Exception occur during get ap details of AP serial number ["+APSerialNumber+"] in cds : "+e)
		return res.json({
			success: false,
			message: "Get AP details Exception: "+e
		});
	}
});


//get list of AP api /getAPs
router.get('/aps', function(req, res, next) {
	logger.info("Get list of APs API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 25;
		}else{
			var numberofrows = parseInt(req.query.numberofrows);
		}
		if(numberofrows > 100){
			return res.json({
				success: false,
				message: 'You can retrive maximum 100 recored at one time'
			});	
		}		
		if(!req.query.sortby){			
			var sortByColumn = '_id';
		}else{
			var sortByColumn = req.query.sortby;
		}
		if(!req.query.sortorder){			
			var sortOrder = 1;
		}else{
			if(req.query.sortorder != 1 && req.query.sortorder != -1){
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
		
		//build count query
		var queryCount = APModel.count({ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]});
		
		//build filter query
		var queryFilter = APModel.find({ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
		  if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{			
				output.totalCount = APCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = (startindex-1)*numberofrows;
						var allRows = APs.length + previousCount;		
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = APs;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("Get AP List : Exception occur during get ap list API : "+e)
		return res.json({
			success: false,
			message: "Get list of AP Exception: "+e
		});
	}
});


//get list of AP api /getAPs
router.post('/apList', function(req, res, next) {
	logger.info("Get list of APs API start from here");
	var startindex, numberofrows, sortByColumn, sortColumnID, sortorder, sortColumnBy, sortString, searchText, searchTextRegExp, output, sortString, queryCount, queryFilter;
	var requestPayload = req.body;
	try{
		if (requestPayload.start !=0) {
			startindex = requestPayload.start;
		} else {
			startindex = 0;
		}
		if (requestPayload.length != 0) {
			numberofrows = requestPayload.length;
		} else {
			numberofrows = 0;
		}
		if (requestPayload.order[0].column >= 0) {
			sortColumnID = requestPayload.order[0].column;
			sortByColumn = requestPayload.columns[sortColumnID].data;
		} else {
			sortByColumn = requestPayload.columns[0].data;
		}
		sortColumnBy = requestPayload.order[0].dir;
		if (sortColumnBy == 'asc') {
				sortOrder = 1;
		} else if (sortColumnBy == 'desc') {
			sortOrder = -1;
		}
		sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if (requestPayload.search.value != "") {
			searchText = requestPayload.search.value;
		} else {
			searchText = "";
		}

		output = '{"recordsTotal":0,"recordsFiltered":0,"draw":0,"data":[]}';
		output = JSON.parse(output);
		
		searchTextRegExp = new RegExp(searchText,'i');
		
		//build count query
		queryCount = APModel.count({ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]});
		
		//build filter query
		queryFilter = APModel.find({ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]}).sort(sortString).skip(startindex).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
			if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{				
				output.recordsFiltered = APCount;
				output.recordsTotal = APCount;	
				output.draw = req.body.draw;		
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						output.data = APs;
												
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("Get AP List : Exception occur during get ap list API : "+e)
		return res.json({
			success: false,
			message: "Get list of AP Exception: "+e
		});
	}
});

//Call SZ API to add AP to SZ
router.post('/aps', function(req, res) {	
	logger.info("Add AP API start from here");
	try{
		var ApExists = false;
		var clusterId = ""; 
		var ApZoneName = "";			
		var ApZoneId = "";			
		var currentDate = new Date();
		var sourceip = aputils.getClientIp(req);
		var action = "Create"
		var resource = "Access Point"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		if(req.body && (req.body.apserial == "" || req.body.apserial == undefined)){
			return res.json({
				success: false,
				message: 'AP Serial number is missing in the request.'
			});
		}else{
			if(req.body && (req.body.apname == "" || req.body.apname == undefined)){
				var APName = "";
			}else{
				var APName = req.body.apname;
			}
			if(req.body && (req.body.clusterip == "" || req.body.clusterip == undefined)){
				var ClusterIp = "";
			}else{
				var ClusterIp = req.body.clusterip;
			}
			if(req.body && (req.body.zonename != "" && req.body.zonename != undefined)){
				ApZoneName = req.body.zonename;
			}
			
			//check if AP already exists
			APModel.findOne({ apserial: req.body.apserial }, function(err, ap) {			
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					}); 
				}else if(ap && (ap.apserial == req.body.apserial)){
					logger.info("Add AP : AP Serial number ["+req.body.apserial+"] already exists in cds")
					return res.json({
						success: false,
						message: 'AP Serial number already exists.'
					});
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
							return res.json({
								success: false,
								message: dbErrorMessage
							}); 
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
								logger.info("Add AP : Zone name ["+ApZoneName+"] not found when adding AP ["+req.body.apserial+"] in cds")
								return res.json({
									success: false,
									message: 'Zone name not found in cluster.'
								});
							}else{
								if(ApZoneName != ""){
									var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
									promiseCall = CommonClusterObj.login();
									promiseCall.then(function (result) {														
										return CommonClusterObj.AddAp(APName, req.body.apserial, ApZoneId, "Unlocked");
									})
									.then(function (result) {
										result = JSON.parse(result);
										if(result.success){
											return CommonClusterObj.GetAP(req.body.apserial);
										}else{
											if(result.error.message){
												return res.json({
													success: false,
													message: result.error.message
												});
											}else{
												return res.json(result);
											}											
										}
									})
									.then(function (result) {
										result = JSON.parse(result);
										let connObj = CommonClusterObj.connObj
										let clusterAPState = connObj.is35orLater() ? 'Offline' : 'Flagged';
										let apIp = result.ip ? result.ip : ''
										var newAP = new APModel({ apserial: req.body.apserial, clusterid : clusterId, clustername : clusterName, mac: "", apname: APName, model: result.model, ip: apIp, zonename: req.body.zonename, zoneid: ApZoneId, connectionstate:result.connectionState, configmethod: "PROVISIONED", cds_cluster_state: 'PREPROVISIONED', clusterapstate : clusterAPState, username: req.decoded.username, lastsynchtime : currentDate });
										newAP.save(function (err) {
											if (err){
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											} else {
												CommonService.populateNumberOfAPsPerCluster(clusterId, function(error, result){
													if(error){
														logger.info('Add AP : Access Point ['+req.body.apserial+'] created, added to zone ['+req.body.zonename+'] in ['+clusterName+'] cluster, but error while populating number of APs in cluster :'+result)
														var description = 'Access Point ['+req.body.apserial+'] created, added to zone ['+req.body.zonename+'] in ['+clusterName+'] cluster, but error while populating number of APs in cluster :'+result
														auditLogData.description = description
														CommonService.createAuditLog(auditLogData)
														return res.json({
															success: true,
															message: "AP added to zone successfully, but error while populating number of APs in cluster :"+result 
														});
													}else{
														var description = 'Access Point ['+req.body.apserial+'] created, added to zone ['+req.body.zonename+'] in ['+clusterName+'] cluster';
														auditLogData.description = description
														CommonService.createAuditLog(auditLogData)
														return res.json({
															success: true,
															message: "AP added to zone successfully."
														});
													}
												});
											}								   
										});	
									})				
									.catch(function (reason) {
										if(reason == "Unreachable"){
											logger.info('Add AP : AP ['+req.body.apserial+'] not added, Cluster IP ['+cluster.ip+'] is not reachable')
											var description = 'AP ['+req.body.apserial+'] not added, Cluster IP ['+cluster.ip+'] is not reachable';
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
											return res.json({
												success: false,
												message: "Cluster IP is not reachable"
											});
										}else{
											logger.info('Add AP : Error while adding AP ['+req.body.apserial+'] :'+reason)
											var description = "Error while adding AP : "+reason
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
											return res.json({
												success: false,
												message: "Error : "+reason
											});
										}
									});
								}else{
									var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
									promiseCall = CommonClusterObj.login();
									promiseCall.then(function (result) {														
										var newAP = new APModel({ apserial: req.body.apserial, clusterid : clusterId, clustername : clusterName, mac: "", apname: APName, model: "", zonename: "", zoneid: "", connectionstate: "", configmethod: "PROVISIONED", username: req.decoded.username});
										newAP.save(function (err) {
											if (err){
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											} else {										 
												CommonService.populateNumberOfAPsPerCluster(clusterId, function(error, result){
													if(error){
														logger.info("Add AP : AP ["+req.body.apserial+"] added to cluster successfully, but error while populating number of APs in cluster :"+result);
														var description = "AP ["+req.body.apserial+"] added to cluster ["+clusterName+"] successfully, but error while populating number of APs in cluster :"+result
														auditLogData.description = description
														CommonService.createAuditLog(auditLogData)
														return res.json({
															success: true,
															message: "AP added to cluster successfully, but error while populating number of APs in cluster :"+result 
														});
													}else{
														var description = "AP added to cluster ["+clusterName+"] successfully, but not linked with any zone"
														auditLogData.description = description
														CommonService.createAuditLog(auditLogData)
														return res.json({
															success: true,
															message: "AP added to cluster successfully."
														});
													}
												});
											}								   
										});	
									})				
									.catch(function (reason) {
										if(reason == "Unreachable"){
											logger.info('Add AP : AP ['+req.body.apserial+'] not added, Cluster IP ['+cluster.ip+'] is not reachable')
											var description = 'AP ['+req.body.apserial+'] not added, Cluster IP ['+cluster.ip+'] is not reachable';
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
											return res.json({
												success: false,
												message: "Cluster IP is not reachable"
											});
										}else{
											logger.info('Add AP : Error while adding AP ['+req.body.apserial+'] :'+reason)
											var description = "Error while adding AP ["+req.body.apserial+"] : "+reason
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
											return res.json({
												success: false,
												message: "Error : "+reason
											});
										}
									});
								}

							}							
						}else{
							if(ClusterIp == ""){
								var newAP = new APModel({ apserial: req.body.apserial, clusterid : "", clustername : "", mac: "", apname: APName, model: "", zonename: "", zoneid: "", connectionstate: "", configmethod: "PROVISIONED", username: req.decoded.username});
								newAP.save(function (err) {
									if (err){
										logger.info(dbErrorMessage);
										logger.info(err);
										var description = "Error while adding AP : "+err
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: dbErrorMessage
										});
									} else {									 
										var description = "AP ["+req.body.apserial+"] added successfully but no cluster linked with it"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: true,
											message: "AP added successfully."
										});
									}								   
								});
							}else{
								logger.info("Add AP : AP ["+req.body.apserial+"] not added, Cluster IP not configured")
								var description = "AP ["+req.body.apserial+"] not added, Cluster IP not configured"
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)
								return res.json({
									success: false,
									message: 'Cluster IP not configured.'
								});
							}
						}
					});
				}
			});		
		}
	} catch(e){
		logger.info("Add AP : Exception occur during add ap API : "+e)
		return res.json({
			success: false,
			message: "Add AP Exception: "+e
		});
	}
});


//update AP info
router.put('/aps/:apserial', function(req, res) {	
	logger.info("Update AP API start from here");
	try{
		var ApExists = false;
		var clusterId = ""; 
		var ApZoneName = "";			
		var ApZoneId = "";			
		var currentDate = new Date();
		var APSerialNumber = req.params.apserial;
		if(req.body && (req.body.apname == "" || req.body.apname == undefined)){
			var APName = "";
		}else{
			var APName = req.body.apname;
		}
		if(req.body && (req.body.zonename != "" && req.body.zonename != undefined)){
			ApZoneName = req.body.zonename;
		}
		var sourceip = aputils.getClientIp(req);
		var action = "Move"
		var resource = "Access Point"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		//check if AP exists or not
		APModel.findOne({ apserial: APSerialNumber }, function(err, ap) {			
			if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				}); 
			}else if(ap && (req.body.clusterip == "" || req.body.clusterip == undefined) && ap.clusterid == ""){
				return res.json({
					success: false,
					message: "You must choose a cluster to move AP"
				});
			}else if(ap && ap.connectionstate != 'Connect' && ap.connectionstate != ""){
				return res.json({
					success: false,
					message: "AP ["+APSerialNumber+"] is not connected in ("+ap.clustername+"). we cannot perform this action now"
				});
			}else if(ap && (ap.apserial == APSerialNumber)){			
				if(req.body && (req.body.clusterip == "" || req.body.clusterip == undefined)){
					var searchString = '{"_id":"'+ap.clusterid+'"}';
				}else{
					var searchString = '{"ip":"'+req.body.clusterip+'"}';
				}
				searchString = JSON.parse(searchString);
				//check if cluster Ip is configured or not
				ClusterModel.findOne(searchString, function(err, cluster) {	
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						}); 
					}else if(cluster && (ap.clusterid == cluster._id) && (ap.zonename == ApZoneName)){
						var clusterIpInput = cluster.ip;
						var CommonClusterObj = new CommonCluster(clusterIpInput, cluster.loginid, cluster.password);	
						promiseCall = CommonClusterObj.login();
						promiseCall.then(function (result) {
							if(ApZoneName != ""){
								CommonClusterObj.GetAP(APSerialNumber).then(function (result) {
									result = JSON.parse(result);
									let apIp = result.ip ? result.ip : ''
									APModel.findOneAndUpdate({ apserial: APSerialNumber }, { apname: APName, model: result.model, ip: apIp, connectionstate : result.connectionState, lastsynchtime: currentDate, last_modified : currentDate }, function(err, updateAp) {
										if (err){
											logger.info(dbErrorMessage);
											logger.info(err);
											return res.json({
												success: false,
												message: dbErrorMessage
											});
										} else {
											var description = "AP ["+APSerialNumber+"] updated successfully"
											auditLogData.description = description
											CommonService.createAuditLog(auditLogData)
											return res.json({
												success: true,
												message: "AP updated successfully."
											});
										}	
									});
								}).catch(function (reason) {
									logger.info("Move AP : Error occur while updating ap serial ["+APSerialNumber+"] details : "+reason)
									return res.json({
										success: false,
										message: "Error : "+reason
									});
								});	
							}else{
								APModel.findOneAndUpdate({ apserial: APSerialNumber }, { apname: APName, last_modified : currentDate}, function(err, updateAp) {
									if (err){
										logger.info(dbErrorMessage);
										logger.info(err);
										return res.json({
											success: false,
											message: dbErrorMessage
										});
									} else {
										var description = "AP ["+APSerialNumber+"] updated successfully"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: true,
											message: "AP updated successfully."
										});
									}	
								});
							}
						})				
						.catch(function (reason) {
							if(reason == "Unreachable"){
								logger.info("Move AP : Error occur while updating ap serial ["+APSerialNumber+"] details : Cluster IP ["+clusterIpInput+"] is not reachable")
								var description = "Cluster IP ["+clusterIpInput+"] is not reachable"
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)
								return res.json({
									success: false,
									message: "Cluster IP is not reachable"
								});
							}else{
								logger.info("Move AP : Error occur while updating ap serial ["+APSerialNumber+"] details : "+reason)
								return res.json({
									success: false,
									message: "Error : "+reason
								});
							}
						});						
					}else if(cluster && (ap.clusterid == cluster._id && ap.zonename != ApZoneName)){	
						var clusterIpInput = cluster.ip;
						clusterId = cluster._id; 
						clusterName = cluster.name; 
						if(ApZoneName != ""){
							ZoneList = cluster.zones;
							ZoneList.forEach(function(zone) {
								if(zone.name == req.body.zonename){
									ApZoneId = zone.id;
								}
							});
						}	
						if(ApZoneId == "" && ApZoneName != ""){
							logger.info("Move AP : Zone name ["+ApZoneName+"] not found while updating ap serial ["+APSerialNumber+"] details")
							return res.json({
								success: false,
								message: 'Zone name not found in cluster.'
							});
						}else{
							if(ApZoneName != ""){
								var CommonClusterObj = new CommonCluster(clusterIpInput, cluster.loginid, cluster.password);	
								promiseCall = CommonClusterObj.login();
								promiseCall.then(function (result) {
									return CommonClusterObj.AddAp(APName, APSerialNumber, ApZoneId, "Unlocked");
								})
								.then(function (result) {
									result = JSON.parse(result);
									if(result.success !== false){
										let connObj = CommonClusterObj.connObj
										let clusterAPState = connObj.is35orLater() ? 'Offline' : 'Flagged';
										APModel.findOneAndUpdate({ apserial: APSerialNumber }, { mac: "", apname: APName, model: '', ip: '', zonename: req.body.zonename, zoneid: ApZoneId, connectionstate:'Provisioned', configmethod: "PROVISIONED", cds_cluster_state: 'PREPROVISIONED', clusterapstate : clusterAPState, username: req.decoded.username, lastsynchtime : currentDate}, function(err, updateAp) {
											if (err){
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											} else {
												var description = "AP ["+APSerialNumber+"] moved to ["+clusterName+"] in ["+req.body.zonename+"] zone"
												auditLogData.description = description
												CommonService.createAuditLog(auditLogData)
												return res.json({
													success: true,
													message: "AP updated successfully."
												});
											}								   
										});	
									}else{
										logger.info("Move AP : Smart zone API error while adding AP ["+APSerialNumber+"]")
										logger.error(result)					
										if(result.error.message){
											return res.json({
												success: false,
												message: "Error while moving AP ["+APSerialNumber+"] "+result.error.message 
											});
										}else{
											return res.json({
												success: false,
												message: "Error while moving AP ["+APSerialNumber+"] "+result 
											});
										}
									}
								})				
								.catch(function (reason) {
									if(reason == "Unreachable"){
										var description = "Cluster IP ["+clusterIpInput+"] is not reachable"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Cluster IP is not reachable"
										});
									}else{
										var description = "Error while moving AP ["+APSerialNumber+"]"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Error : "+reason
										});
									}
								});
							}else{
								var CommonClusterObj = new CommonCluster(clusterIpInput, cluster.loginid, cluster.password);	
								promiseCall = CommonClusterObj.login();
								promiseCall.then(function (result) {
									if(ap.zoneid != ""){
										return CommonClusterObj.deleteAp(APSerialNumber);		
									}else{
										return '{"success":true}';
									}	
								})
								.then(function (result) {
									result = JSON.parse(result);
									if(result.success){
										APModel.findOneAndUpdate({ apserial: APSerialNumber }, { mac: "", apname: APName, model: "", zonename: "", zoneid: "", connectionstate : "", cds_cluster_state : "", clusterapstate : "", configmethod: "PROVISIONED", username: req.decoded.username}, function(err, updateAp) {
											if (err){
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											} else {									 
												var description = "AP ["+APSerialNumber+"] move to ["+clusterName+"] in cluster but not linked with any zone"
												auditLogData.description = description
												CommonService.createAuditLog(auditLogData)
												return res.json({
													success: true,
													message: "AP updated successfully."
												});
											}								   
										});
									}else{
										logger.info("Move AP : Error while deleting AP ["+APSerialNumber+"] :"+result)
										var description = "Error in deleting AP while moving AP ["+APSerialNumber+"]"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Error : AP not deleted from existing cluster properly, please try again."
										});
									}
								})			
								.catch(function (reason) {
									if(reason == "Unreachable"){
										var description = "Cluster IP ["+clusterIpInput+"] is not reachable"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Cluster IP is not reachable"
										});
									}else{
										logger.info("Move AP : Error while moving AP ["+APSerialNumber+"] :"+reason)
										var description = "Error while moving AP ["+APSerialNumber+"] : "+reason
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Error : "+reason
										});
									}
								});
							}								
						}
					}else if(cluster && (ap.clusterid != cluster._id)){
						var old_cluster_ip = "";
						var old_cluster_loginid = "";
						var old_cluster_password = "";
						if(!ap.clusterid){
							clusterId = cluster._id; 
							clusterName = cluster.name; 
							if(ApZoneName == ""){
								APModel.findOneAndUpdate({ apserial: APSerialNumber }, { apname: APName, clusterid : clusterId, clustername : clusterName, zonename: "", zoneid: "", connectionstate : "", cds_cluster_state : "", clusterapstate : "", configmethod: "PROVISIONED", last_modified : currentDate }, function(err, updateAp) {
									if (err){
										logger.info(dbErrorMessage);
										logger.info(err);
										return res.json({
											success: false,
											message: dbErrorMessage
										});
									} else {
										var description = "AP ["+APSerialNumber+"] moved in ["+clusterName+"] but not linked with any zone"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: true,
											message: "AP updated successfully."
										});
									}	
								});
							}else{
								ZoneList = cluster.zones;
								ZoneList.forEach(function(zone) {
									if(zone.name == req.body.zonename){
										ApZoneId = zone.id;
									}
								});								
								var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
								promiseCall = CommonClusterObj.login();
								promiseCall.then(function (result) {
									return CommonClusterObj.AddAp(APName, APSerialNumber, ApZoneId, "Unlocked");										
								})
								.then(function (result) {
									result = JSON.parse(result);									
									if(result.success){
										let connObj = CommonClusterObj.connObj
										let clusterAPState = connObj.is35orLater() ? 'Offline' : 'Flagged';	
										APModel.findOneAndUpdate({ apserial: APSerialNumber }, { apname: APName, clusterid : clusterId, clustername : clusterName, mac: "", model: '', ip: '', zonename: req.body.zonename, zoneid: ApZoneId, connectionstate:'Provisioned', clusterapstate : clusterAPState, cds_cluster_state: 'PREPROVISIONED', last_modified : currentDate }, function(err, updateAp) {
											if (err){
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											} else {
												var description = "AP ["+APSerialNumber+"] moved in ["+clusterName+"] and linked to ["+req.body.zonename+"] zone"
												auditLogData.description = description
												CommonService.createAuditLog(auditLogData)
												return res.json({
													success: true,
													message: "AP updated successfully."
												});
											}	
										});	
									}else{
										if(result.error.message){
											return res.json({
												success: false,
												message: "Error while adding ap in new zone : "+result.error.message
											});
										}else{
											return res.json({
												success: false,
												message: "Error while adding ap in new zone : "+result
											});
										}
									}
								})				
								.catch(function (reason) {
									if(reason == "Unreachable"){
										var description = "Cluster IP ["+cluster.ip+"] is not reachable"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Cluster IP is not reachable"
										});
									}else{
										var description = "Error while moving AP ["+APSerialNumber+"] : "+reason
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Error : "+reason
										});
									}
								});		
							}
						}else{
							ClusterModel.findOne({ _id: ap.clusterid }, function(err, controller) {
								if(err){
									logger.info(dbErrorMessage);
									logger.info(err);
									return res.json({
										success: false,
										message: dbErrorMessage
									});
								}else{
									old_cluster_ip = controller.ip;
									old_cluster_loginid = controller.loginid;
									old_cluster_password = controller.password;
									var clusterIpInput = cluster.ip;
									clusterId = cluster._id; 
									clusterName = cluster.name; 
									if(ApZoneName != ""){
										ZoneList = cluster.zones;
										ZoneList.forEach(function(zone) {
											if(zone.name == req.body.zonename){
												ApZoneId = zone.id;
											}
										});
									}									
									if(ApZoneId == "" && ApZoneName != ""){
										logger.info("Move AP : Zone name ["+ApZoneName+"] not found while adding AP ["+APSerialNumber+"] in cds")
										return res.json({
											success: false,
											message: 'Zone name not found in cluster.'
										});
									}else{
										if(ApZoneName != ""){								
											//delete from existing cluster's zone
											var CommonClusterObj = new CommonCluster(old_cluster_ip, old_cluster_loginid, old_cluster_password);	
											promiseCall = CommonClusterObj.login();
											promiseCall.then(function (result) {
												if(ap.zoneid != ""){
													return CommonClusterObj.deleteAp(APSerialNumber);		
												}else{
													return '{"success":true}';
												}										
											})
											.then(function (result) {
												result = JSON.parse(result);
												if(result.success){
													//add in new cluster's zone
													var CommonClusterObj = new CommonCluster(clusterIpInput, cluster.loginid, cluster.password);	
													promiseCall = CommonClusterObj.login();
													promiseCall.then(function (result) {
														return CommonClusterObj.AddAp(APName, APSerialNumber, ApZoneId, "Unlocked");										
													})
													.then(function (result) {
														result = JSON.parse(result);									
														if(result.success){
															let connObj = CommonClusterObj.connObj
															let clusterAPState = connObj.is35orLater() ? 'Offline' : 'Flagged';
															APModel.findOneAndUpdate({ apserial: APSerialNumber }, {clusterid : clusterId, clustername : clusterName, mac: "", apname: APName, model: '', ip: '', zonename: req.body.zonename, zoneid: ApZoneId, connectionstate:'Provisioned', configmethod: "PROVISIONED", cds_cluster_state: 'PREPROVISIONED', clusterapstate : clusterAPState, username: req.decoded.username, lastsynchtime : currentDate }, function(err, updateAp) {
																if (err){
																	logger.info(dbErrorMessage);
																	logger.info(err);
																	return res.json({
																		success: false,
																		message: dbErrorMessage
																	});
																} else {
																	CommonService.populateNumberOfAPsPerCluster(ap.clusterid, function(error, result){
																		if(error){
																			logger.info("Move AP : AP ["+APSerialNumber+"] moved to ["+clusterName+"] cluster but error while populating number of APs in cluster ["+old_cluster_ip+"] :"+result)
																		}
																	});
																	CommonService.populateNumberOfAPsPerCluster(clusterId, function(error, result){
																		if(error){
																			logger.info("Move AP : AP ["+APSerialNumber+"] moved to ["+clusterName+"] cluster and linked to ["+req.body.zonename+"] zone but error while populating number of APs in cluster :"+result)
																			var description = "AP ["+APSerialNumber+"] moved to ["+clusterName+"] cluster and linked to ["+req.body.zonename+"] zone but error while populating number of APs in cluster :"+result 
																			auditLogData.description = description
																			CommonService.createAuditLog(auditLogData)
																			return res.json({
																				success: true,
																				message: "AP updated successfully, but error while populating number of APs in cluster :"+result 
																			});
																		}else{
																			var description = "AP ["+APSerialNumber+"] moved to ["+clusterName+"] cluster and linked to ["+req.body.zonename+"] zone"
																			auditLogData.description = description
																			CommonService.createAuditLog(auditLogData)
																			return res.json({
																				success: true,
																				message: "AP updated successfully."
																			});
																		}
																	});
																}								   
															});	
														}else{
															if(result.error.message){
																return res.json({
																	success: false,
																	message: "Error while adding ap in new zone : "+result.error.message
																});
															}else{
																return res.json({
																	success: false,
																	message: "Error while adding ap in new zone : "+result
																});
															}
														}
													})				
													.catch(function (reason) {
														if(reason == "Unreachable"){
															var description = "Cluster IP ["+clusterIpInput+"] is not reachable" 
															auditLogData.description = description
															CommonService.createAuditLog(auditLogData)
															return res.json({
																success: false,
																message: "Cluster IP is not reachable"
															});
														}else{
															return res.json({
																success: false,
																message: "Error : "+reason
															});
														}
													});													
												}else{
													logger.info("Move AP : AP ["+APSerialNumber+"] not deleted from existing cluster properly :"+result)
													return res.json({
														success: false,
														message: "Error : AP not deleted from existing cluster properly, please try again"
													});
												}
											})			
											.catch(function (reason) {
												if(reason == "Unreachable"){
													var description = "Cluster IP ["+old_cluster_ip+"] is not reachable" 
													auditLogData.description = description
													CommonService.createAuditLog(auditLogData)
													return res.json({
														success: false,
														message: "Cluster IP is not reachable"
													});
												}else{
													return res.json({
														success: false,
														message: "Error : "+reason
													});
												}
											});								

											}else{
												var CommonClusterObj = new CommonCluster(old_cluster_ip, old_cluster_loginid, old_cluster_password);	
												promiseCall = CommonClusterObj.login();
												promiseCall.then(function (result) {
													if(ap.zoneid != ""){
														return CommonClusterObj.deleteAp(APSerialNumber);		
													}else{
														return '{"success":true}';
													}	
												})
												.then(function (result) {
													result = JSON.parse(result);
													if(result.success){
														APModel.findOneAndUpdate({ apserial: APSerialNumber }, {clusterid : clusterId, clustername : clusterName, mac: "", apname: APName, model: "", zonename: "", zoneid: "", connectionstate : "", configmethod: "PROVISIONED", username: req.decoded.username}, function(err, updateAp) {
															if (err){
																logger.info(dbErrorMessage);
																logger.info(err);
																return res.json({
																	success: false,
																	message: dbErrorMessage
																});
															} else {
																CommonService.populateNumberOfAPsPerCluster(ap.clusterid, function(error, result){
																	if(error){
																		logger.info("Move AP : AP ["+APSerialNumber+"] moved to ["+clusterName+"] cluster but error while populating number of APs in cluster ["+old_cluster_ip+"] :"+result)
																	}
																});
																CommonService.populateNumberOfAPsPerCluster(clusterId, function(error, result){
																	if(error){
																		logger.info("Move AP : AP ["+APSerialNumber+"] moved to ["+clusterName+"] cluster but error while populating number of APs in cluster :"+result)
																		return res.json({
																			success: true,
																			message: "AP updated successfully, but error while populating number of APs in cluster :"+result 
																		});
																	}else{
																		var description = "AP ["+APSerialNumber+"] moved to ["+clusterName+"] but not linked to any zone" 
																		auditLogData.description = description
																		CommonService.createAuditLog(auditLogData)
																		return res.json({
																			success: true,
																			message: "AP updated successfully."
																		});
																	}
																});
															}								   
														});
													}else{
														logger.info("Move AP : AP ["+APSerialNumber+"] not deleted from existing cluster properly :"+result)
														return res.json({
															success: false,
															message: "Error : AP ["+APSerialNumber+"] not deleted from existing cluster properly, please try again"
														});
													}
												})			
												.catch(function (reason) {
													if(reason == "Unreachable"){
														var description = "Cluster IP ["+old_cluster_ip+"] is not reachable" 
														auditLogData.description = description
														CommonService.createAuditLog(auditLogData)
														return res.json({
															success: false,
															message: "Cluster IP ["+old_cluster_ip+"] is not reachable"
														});
													}else{
														return res.json({
															success: false,
															message: "Error : "+reason
														});
													}
												});
											}								
										}
									}
								});						
						}
					}else{
						return res.json({
							success: false,
							message: 'Cluster IP not found.'
						});
					}
				});
			}else{
				return res.json({
					success: false,
					message: 'AP Serial number not found'
				});
			}
		});
	} catch(e){
		logger.info("Add AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Add AP Exception: "+e
		});
	}
});

//delete AP api /deleteAP/:apserial
router.delete('/aps/:apserial/:deletefromSZ?', function(req, res, next) {
	logger.info("Delete AP API start from here");
	try{
		var deleteFromVsz = false;
		var sourceip = aputils.getClientIp(req);
		var action = "Delete"
		var resource = "Access Point"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}		
		if(req.params.apserial == "" || req.params.apserial == undefined){
			res.json({
				success: false,
				message: 'AP Serial number is missing in the request.'
			});
		}else{
			APModel.findOne({apserial: req.params.apserial}, function (err, ApInfo) {
				if(err){					
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});	
				}else if(ApInfo && (ApInfo.apserial == req.params.apserial)){					
					if(req.params.deletefromSZ != "" || req.params.deletefromSZ != undefined){
						deleteFromVsz = req.params.deletefromSZ;
					}
					if((deleteFromVsz === true || deleteFromVsz == "true") && ApInfo.zoneid != "" && ApInfo.cds_cluster_state != "NOTINCLUSTER"){
						ClusterModel.findOne({_id: ApInfo.clusterid}, function (err, cluster) {
							if(err){					
								logger.info(dbErrorMessage);
								logger.info(err);
								return res.json({
									success: false,
									message: dbErrorMessage
								});	
							}else if(!cluster){
								logger.info("Delete AP : Cluster IP not found while deleting AP ["+req.params.apserial+"]")
								var description = "Cluster IP not found while deleting AP" 
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)
								return res.json({
									success: false,
									message: "Cluster IP not found"
								});
							}else{
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
										APModel.remove({apserial: req.params.apserial}, function (err) {
											if(err){ 
												logger.info(dbErrorMessage);
												logger.info(err);
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											}else{
												var description = "AP ["+req.params.apserial+"] deleted successfully" 
												auditLogData.description = description
												CommonService.createAuditLog(auditLogData)
												CommonService.populateNumberOfAPsPerCluster(ApInfo.clusterid, function(error, result){
													if(error){
														logger.info("Delete AP : AP deleted successfully, but error while populating number of APs in cluster :"+result);
														return res.json({
															success: true,
															message: "AP deleted successfully, but error while populating number of APs in cluster :"+result 
														});
													}else{
														return res.json({
															success: true,
															message: "AP deleted successfully "
														});	
													}
												});			
											}
										});
									}else{
										logger.info("Delete AP : Smart zone API error while deleting AP ["+req.params.apserial+"]");
										logger.info(result);
										res.json({
											success: false,
											message: "Error : "+result.message
										});
									}
								})  
								.catch(function (reason) {
									if(reason == "Unreachable"){							
										logger.info("Cluster IP ["+cluster.ip+"] is not reachable from CDS.");
										var description = "Cluster IP ["+cluster.ip+"] not Reachable while deleting AP ["+req.params.apserial+"]"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)
										return res.json({
											success: false,
											message: "Cluster IP ["+cluster.ip+"] is not reachable from CDS."
										});
									}else{
										logger.info("Error while deleting AP ["+req.params.apserial+"]");
										logger.info(reason);
										var description = "Error while deleting AP ["+req.params.apserial+"] : "+reason
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
					}else{
						APModel.remove({apserial: req.params.apserial}, function (err) {
							if(err){ 
								logger.info(dbErrorMessage);
								logger.info(err);
								return res.json({
									success: false,
									message: dbErrorMessage
								});
							}else{
								var description = "AP ["+req.params.apserial+"] deleted successfully" 
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)
								if(ApInfo.clusterid){
									CommonService.populateNumberOfAPsPerCluster(ApInfo.clusterid, function(error, result){
										if(error){
											logger.info("Delete AP : AP deleted successfully, but error while populating number of APs in cluster :"+result);
											return res.json({
												success: true,
												message: "AP deleted successfully, but error while populating number of APs in cluster :"+result 
											});
										}else{
											return res.json({
												success: true,
												message: "AP deleted successfully "
											});	
										}
									});	
								}else{
									return res.json({
										success: true,
										message: "AP deleted successfully "
									});	
								}								
							}
						});
					}					
				}else{
					return res.json({
						success: false,
						message: "AP not found."
					});
				}
			});			
		}
	} catch(e){
		logger.info("deleteAP executed catch : "+e);
		return res.json({
			success: false,
			message: "AP Delete Exception: "+e
		});
	}
});

//import cluster aps 
router.post('/importclusteraps', function(req, res, next) {
	logger.info("Import cluster APs API start from here");
	try{
		var controlIpCds = [];
		var managementIpCds = [];
		var zonesCds = [];
		var controllerFound = false;
		var ImportClusterAps = false;
		var isDefaultCluster = false;
		var controllerName = "";
		var sourceip = aputils.getClientIp(req);
		var action = "Import"
		var resource = "Access Point"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}		
		if(req.body && (req.body.clusterip == "" || req.body.clusterip == undefined) && (req.body.clustername == "" || req.body.clustername == undefined)){
			res.json({
				success: false,
				message: 'Cluster IP or Name is missing in the request.'
			});
		}else{
			//find cluster
			ClusterModel.findOne({ $or: [ { ip: req.body.clusterip }, { name: req.body.clustername } ] }, function(err, cluster) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					}); 
				}else if(cluster){
					if(req.body.clusterip && cluster.ip != req.body.clusterip){
						res.json({
							success: false,
							message: 'Cluster IP not configured.'
						});
					}else if(req.body.clustername && cluster.name != req.body.clustername){
						res.json({
							success: false,
							message: 'Cluster not configured.'
						});
					}else{	
						var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
						promiseCall = CommonClusterObj.login();
						promiseCall.then(function (result) {
							CommonService.populateApDataWhenClusterAdded(cluster.ip,cluster.loginid, cluster.password,cluster._id, cluster.name, cluster.zones, req.decoded.username,function(message, result){
								if(result){
									var description = "Cluster ["+cluster.name+"] APs imported successfully" 
									auditLogData.description = description
									CommonService.createAuditLog(auditLogData)
									CommonService.populateNumberOfAPsPerCluster(cluster._id, function(error, result){
										if(error){
											logger.info("Cluster APs data imported successfully. ["+message+"], but error while populating number of APs"+result);
											return res.json({
												success: true,
												message: "Cluster APs data imported successfully. ["+message+"], but error while populating number of APs"+result 
											});
										}else{
											ClusterModel.findOneAndUpdate({ _id: cluster._id }, { apsimported: true }, function(err) {								
												return res.json({
													success: true,
													message: "Cluster APs data imported successfully. ["+message+"]"
												});
											});
										}
									});
								}else{
									logger.info("Error while importing ["+cluster.name+"] cluster APs data. ["+message+"]");
									var description = "Error while importing ["+cluster.name+"] cluster APs data. ["+message+"]"
									auditLogData.description = description
									CommonService.createAuditLog(auditLogData)
									return res.json({
										success: true,
										message: "Error while importing APs data. ["+message+"]"
									});
								}
							});		
						})  
						.catch(function (reason) {
							if(reason == "Unreachable"){							
								logger.info("Cluster IP ["+cluster.ip+"] is not reachable from CDS.");
								var description = "Cluster IP ["+cluster.ip+"] not Reachable"
								auditLogData.description = description
								CommonService.createAuditLog(auditLogData)
								return res.json({
									success: false,
									message: "Cluster IP ["+cluster.ip+"] is not reachable from CDS."
								});
							}else{								
								res.json({
									success: false,
									message: "Error : "+reason
								});
							}
						});
					}	
				}else{
					res.json({
						success: false,
						message: 'Cluster not configured.'
					});
				}					
			});
		}
	} catch(e){
		logger.info("Import cluster APs catch : "+e);
		return res.json({
			success: false,
			message: "Import cluster APs Exception: "+e
		});
	}
});


//get AP status api /apstatus/:apserial
router.get('/apstatus/:apserial', function(req, res, next) {
	logger.info("Get AP status API start from here");
	try{
		var APSerialNumber = req.params.apserial;		
		if(APSerialNumber == ""){
			return res.json({
				success: false,
				message: 'AP serial number missing in the request.'
			});
		}else{
			CommonService.getAPStatus(APSerialNumber, function(error, result){
				if(error){
					return res.json({
						success: false,
						message: result
					});
				}else{
					return res.json({
						success: true,
						apstatus: result
					});
				}
			});	
		}
	} catch(e){
		logger.info("get AP status executed catch : "+e);
		return res.json({
			success: false,
			message: "Get AP status Exception: "+e
		});
	}
});

//Bulk AP deletion api /bulkapdelete/:commaSepratedApSerial
router.delete('/bulkapdelete/:commaSepratedApSerial/:deletefromSZ?', function(req, res, next) {
	logger.info("Bulk AP deletion API start from here");
	try{
		var deleteFromVsz = false;
		//logger.info('Bulk AP deletion API req.body: '+JSON.stringify(req.body));
		var ResMessages = [];
		if(req.params.commaSepratedApSerial == "" || req.params.commaSepratedApSerial == undefined){
			res.json({
				success: false,
				message: 'AP Serial number is missing in the request.'
			});
		}else{
			var ApSerialStr = req.params.commaSepratedApSerial;
			var ApSerialArr = ApSerialStr.split(",");
			//logger.info("Bulk AP deletion API commaSepratedApSerial : " + ApSerialArr);
			var loopCount = 1;
			var ResMessages = [];
			if(req.params.deletefromSZ != "" || req.params.deletefromSZ != undefined){
				deleteFromVsz = req.params.deletefromSZ;
			}
			var ApFailed = 0;
			var ApSuccess = 0;
			var resmessage = "";
			var sourceip = aputils.getClientIp(req);
			var action = "Bulk Delete"
			var resource = "Access Point"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}	
			ApSerialArr.forEach(function(apSerialNumber) {
				//logger.info("Delete AP Serial # : " + apSerialNumber);
				CommonService.bulkapdelete(apSerialNumber, deleteFromVsz, ResMessages, function(error, result){
					if(error){
						logger.info("Bulk Delete AP : AP ["+apSerialNumber+"] delete response : "+result);
						ApFailed = ApFailed + 1;
						resmessage = ApSuccess+" APs deleted, "+ApFailed+" APs failed"; 
						if(loopCount == ApSerialArr.length){
							auditLogData.description = resmessage
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: false,
								message: resmessage
							});
						}
						loopCount = loopCount + 1;
					}else{
						ApSuccess = ApSuccess + 1;
						resmessage = ApSuccess+" APs deleted, "+ApFailed+" APs failed"; 
						if(loopCount == ApSerialArr.length){
							auditLogData.description = resmessage
							CommonService.createAuditLog(auditLogData)
							if(result.length > 0){
								return res.json({
									success: true,
									message: resmessage
								});
							}else{
								return res.json({
									success: true,
									message: resmessage
								});
							}
						}
						loopCount = loopCount + 1;
					}
				});	
			});	
		}
	} catch(e){
		logger.info("Bulk AP Delete executed catch : "+e);
		return res.json({
			success: false,
			message: "Bulk AP Delete Exception: "+e
		});
	}
});


//Bulk AP Upload
router.post('/bulkapupload', async(req, res, next) => {
	logger.info("Bulk AP Upload API start from here");
	try{
		var ResMessages = [];
		var bulkUploadTaskId = null;
		if(req.body == "" || req.body == undefined){
			return res.json({
				success: false,
				message: 'Bulk ap upload payload is missing in the request'
			});
		}else{	
			var apPayloadData = getCsvDataParsing(req.body);
			if(!Array.isArray(apPayloadData)){
				return res.json({
					success: false,
					message: apPayloadData
				});
			}
			if(!apPayloadData.length){
				return res.json({
					success: false,
					message: 'Bulk ap upload payload is missing in the request'
				});
			}
			var loopCount = 1;
			var ResMessages = [];
			var errorInRequest = false;
			var sourceip = aputils.getClientIp(req);
			var action = "Bulk APs Upload"
			var resource = "Access Point"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}			
			for (j = 0; j < apPayloadData.length; j++){
				if(apPayloadData[j].apserial == "" || apPayloadData[j].apserial == undefined){
					logger.info("AP Serial number is missing in one of request");
					errorInRequest = true;
					return res.json({
						success: false,
						message: "AP Serial number is missing in one of request"
					});
				}
			}
			if(!errorInRequest){
				var retryCounter = 1;	
				const taskProgress = await TPModel.findOne({action : 'bulkapupload', status : 'Running'});
				if(taskProgress){
					return res.json({
						success: false,
						message: "Bulk Upload APs process is already running, please try after some time"
					});
				}	
				let userName = req.decoded.username
				var createTaskProgress = new TPModel({action : 'bulkapupload', status : 'Running', description : 'CSV bulk APs Upload process started successfully', username : userName});
				await createTaskProgress.save(function (err) {
					if (err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						bulkUploadTaskId = createTaskProgress._id
					}							   
				})
				for (i = 0; i < apPayloadData.length;){
					let addRes = await CommonService.bulkapupload(apPayloadData[i], loopCount, req.decoded.username, ResMessages)					
					if(addRes.isUnreachable && retryCounter < 3){
						retryCounter++
						ResMessages.pop();
					} else{
						if(loopCount == apPayloadData.length){
							auditLogData.description = "Bulk APs uploaded"
							CommonService.createAuditLog(auditLogData)
							logger.info(addRes.ResMessages)
							let currentDate = new Date();
							let faildAPs = addRes.ResMessages.length
							let successAPs = apPayloadData.length - addRes.ResMessages.length
							let resMess = successAPs+" APs added | "+faildAPs+" APs failed"; 
							addRes.ResMessages.unshift(resMess);
							if(bulkUploadTaskId){
								TPModel.findOneAndUpdate({ _id: bulkUploadTaskId }, {status : 'Completed', enddate : currentDate, description : addRes.ResMessages}, function(err) {
									if(err){
										logger.info(dbErrorMessage);
										logger.info(err);
									}		
								})
							}
							return res.json({
								success: false,
								message: addRes.ResMessages
							});
						}
						i++;
						retryCounter = 1;
						loopCount = loopCount + 1;
					}
										
				}
			}
		}
	} catch(e){
		logger.info("Bulk AP Upload through Exception : "+e);
		let currentDate = new Date();
		let resMess = "Exception occur while Bulk APs Upload :"+e 
		if(bulkUploadTaskId){
			TPModel.findOneAndUpdate({ _id: bulkUploadTaskId }, {status : 'Error', enddate : currentDate, description : resMess}, function(err) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
				}		
			})
		}
		return res.json({
			success: false,
			message: "Bulk AP Upload Exception: "+e
		});
	}	
});


//check bulk ap upload task status
router.get('/bulkapuploadtaskstatus', async(req, res, next) => {
	logger.info("Start check bulk AP upload task status API start from here")
	//build filter query
	var queryFilter = TPModel.findOne({action : 'bulkapupload'}).sort({starttime : -1});
	queryFilter.exec(function (err, taskStatus) {
		if(err){
			logger.info(dbErrorMessage);
			logger.info(err);
			return res.json({
				success: false,
				message: dbErrorMessage
			});					
		}else if(taskStatus){
			return res.json({
				success: true,
				data: taskStatus,
				message: taskStatus.description
			});	
		}else{
			return res.json({
				success: false,
				message: 'No bulk APs upload process found'
			});
		}
	})
});


//get list of managed APs api /managedaps
router.get('/managedaps', function(req, res, next) {
	logger.info("Get list of Managed APs API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 25;
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
			if(req.query.sortorder != 1 && req.query.sortorder != -1){
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
		
		//build count query
	var queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ clusterapstate: { $in: ['Online','Offline','Flagged'] } } ]});
		
		//build filter query
		var queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]}, { clusterapstate: { $in: ['Online','Offline','Flagged'] } } ]}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
		  if(err){
			  	logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = APCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = (startindex-1)*numberofrows;
						var allRows = APs.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = APs;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of Managed AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of Managed AP Exception: "+e
		});
	}
});


//get list of managed AP internal Post api /managedapList
router.post('/managedapList', function(req, res, next) {
	logger.info("Get list of managed APs POST API start from here");
	var startindex, numberofrows, sortByColumn, sortColumnID, sortorder, sortColumnBy, sortString, searchText, searchTextRegExp, output, sortString, queryCount, queryFilter;
	var requestPayload = req.body;
	try{
		if(!req.query.clustername){
			var clustername = "";
		}else{
			var clustername = req.query.clustername;
		}
		if(!req.query.zonename){
			var zonename = "";
		}else{
			var zonename = req.query.zonename;
		}		
		if (requestPayload.start !=0) {
			startindex = requestPayload.start;
		} else {
			startindex = 0;
		}
		if (requestPayload.length != 0) {
			numberofrows = requestPayload.length;
		} else {
			numberofrows = 0;
		}
		if (requestPayload.order[0].column >= 0) {
			sortColumnID = requestPayload.order[0].column;
			sortByColumn = requestPayload.columns[sortColumnID].data;
		} else {
			sortByColumn = requestPayload.columns[0].data;
		}
		sortColumnBy = requestPayload.order[0].dir;
		if (sortColumnBy == 'asc') {
			sortOrder = 1;
		} else if (sortColumnBy == 'desc') {
			sortOrder = -1;
		}
		sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if (requestPayload.search.value != "") {
			searchText = requestPayload.search.value;
		} else {
			searchText = "";
		}
		output = '{"recordsTotal":0,"recordsFiltered":0,"draw":0,"data":[]}';
		output = JSON.parse(output);
		
		searchTextRegExp = new RegExp(searchText,'i');
		
		//build count query
		if(clustername != ""){
			if(zonename != ""){
				queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ clusterapstate: { $in: ['Online','Offline','Flagged'] } },{clustername: clustername},{zonename: zonename} ]});
				queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ clusterapstate: { $in: ['Online','Offline','Flagged'] } },{clustername: clustername},{zonename: zonename} ]}).sort(sortString).skip(startindex).limit(numberofrows);
			}else{
				queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ clusterapstate: { $in: ['Online','Offline','Flagged'] } }, { clustername: clustername } ]});
				queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]}, { clusterapstate: { $in: ['Online','Offline','Flagged'] } }, { clustername: clustername } ]}).sort(sortString).skip(startindex).limit(numberofrows);
			}
		}else{
			queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ clusterapstate: { $in: ['Online','Offline','Flagged'] } } ]});
			queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]}, { clusterapstate: { $in: ['Online','Offline','Flagged'] } } ]}).sort(sortString).skip(startindex).limit(numberofrows);
		}
		
		//build filter query
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
			if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.recordsFiltered = APCount;
				output.recordsTotal = APCount;	
				output.draw = req.body.draw;		
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						output.data = APs;
												
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of managed AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of managed AP Exception: "+e
		});
	}
});

//get list of unmanaged APs api /unmanagedaps
router.get('/unmanagedaps', function(req, res, next) {
	logger.info("Get list of Unmanaged APs API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 25;
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
			if(req.query.sortorder != 1 && req.query.sortorder != -1){
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
		
		//build count query
		var queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ cds_cluster_state: { $in: ['','STRANDED','NOTINCLUSTER','REJECTED'] } } ]});
		
		//build filter query
		var queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]}, { cds_cluster_state: { $in: ['','STRANDED','NOTINCLUSTER','REJECTED'] } } ]}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
		  if(err){
			  	logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = APCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = (startindex-1)*numberofrows;
						var allRows = APs.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = APs;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of Unmanaged AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of Unmanaged AP Exception: "+e
		});
	}
});


//get list of Unmanaged AP internal Post api /unmanagedapList
router.post('/unmanagedapList', function(req, res, next) {
	logger.info("Get list of Unmanaged APs POST API start from here");
	var startindex, numberofrows, sortByColumn, sortColumnID, sortorder, sortColumnBy, sortString, searchText, searchTextRegExp, output, sortString, queryCount, queryFilter;
	var requestPayload = req.body;
	try{
		if (requestPayload.start !=0) {
			startindex = requestPayload.start;
		} else {
			startindex = 0;
		}
		if (requestPayload.length != 0) {
			numberofrows = requestPayload.length;
		} else {
			numberofrows = 0;
		}
		if (requestPayload.order[0].column >= 0) {
			sortColumnID = requestPayload.order[0].column;
			sortByColumn = requestPayload.columns[sortColumnID].data;
		} else {
			sortByColumn = requestPayload.columns[0].data;
		}
		sortColumnBy = requestPayload.order[0].dir;
		if (sortColumnBy == 'asc') {
			sortOrder = 1;
		} else if (sortColumnBy == 'desc') {
			sortOrder = -1;
		}
		sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if (requestPayload.search.value != "") {
			searchText = requestPayload.search.value;
		} else {
			searchText = "";
		}
		output = '{"recordsTotal":0,"recordsFiltered":0,"draw":0,"data":[]}';
		output = JSON.parse(output);
		
		searchTextRegExp = new RegExp(searchText,'i');
		
		//build count query
		queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ cds_cluster_state: { $in: ['','STRANDED','NOTINCLUSTER','REJECTED'] } } ]});
		
		//build filter query
		queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{ cds_cluster_state: { $in: ['','STRANDED','NOTINCLUSTER','REJECTED'] } } ]}).sort(sortString).skip(startindex).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
			if(err){
				logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.recordsFiltered = APCount;
				output.recordsTotal = APCount;	
				output.draw = req.body.draw;		
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						output.data = APs;
												
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of Unmanaged AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of Unmanaged AP Exception: "+e
		});
	}
});

//get list of Stranded APs api /strandedaps
router.get('/strandedaps', function(req, res, next) {
	logger.info("Get list of Stranded APs API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 25;
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
			if(req.query.sortorder != 1 && req.query.sortorder != -1){
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
		
		//build count query
		var queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{cds_cluster_state: 'STRANDED'} ]});
		
		//build filter query
		var queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{cds_cluster_state: 'STRANDED'} ]}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
		  if(err){
			  	logger.info(dbErrorMessage);
				logger.info(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = APCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = (startindex-1)*numberofrows;
						logger.info("previousCount: "+previousCount);		
						var allRows = APs.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = APs;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of Stranded AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of Stranded AP Exception: "+e
		});
	}
});

//get list of Stranded AP internal Post api /strandedapList
router.post('/strandedapList', function(req, res, next) {
	logger.info("Get list of Stranded APs POST API start from here");
	var startindex, numberofrows, sortByColumn, sortColumnID, sortorder, sortColumnBy, sortString, searchText, searchTextRegExp, output, sortString, queryCount, queryFilter;
	var requestPayload = req.body;
	try{
		if (requestPayload.start !=0) {
			startindex = requestPayload.start;
		} else {
			startindex = 0;
		}
		if (requestPayload.length != 0) {
			numberofrows = requestPayload.length;
		} else {
			numberofrows = 0;
		}
		if (requestPayload.order[0].column >= 0) {
			sortColumnID = requestPayload.order[0].column;
			sortByColumn = requestPayload.columns[sortColumnID].data;
		} else {
			sortByColumn = requestPayload.columns[0].data;
		}
		sortColumnBy = requestPayload.order[0].dir;
		if (sortColumnBy == 'asc') {
			sortOrder = 1;
		} else if (sortColumnBy == 'desc') {
			sortOrder = -1;
		}
		sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if (requestPayload.search.value != "") {
			searchText = requestPayload.search.value;
		} else {
			searchText = "";
		}
		output = '{"recordsTotal":0,"recordsFiltered":0,"draw":0,"data":[]}';
		output = JSON.parse(output);
		
		searchTextRegExp = new RegExp(searchText,'i');
		
		//build count query
		queryCount = APModel.count({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{cds_cluster_state: 'STRANDED'} ]});
		
		//build filter query
		queryFilter = APModel.find({$and: [{ $or: [ {apserial: searchTextRegExp}, {mac: searchTextRegExp}, {apname: searchTextRegExp}, {zonename: searchTextRegExp}, {clustername: searchTextRegExp}, {connectionstate: searchTextRegExp}, {configmethod: searchTextRegExp}, {cds_cluster_state: searchTextRegExp}, {clusterapstate: searchTextRegExp} ]},{cds_cluster_state: 'STRANDED'} ]}).sort(sortString).skip(startindex).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
			logger.info(dbErrorMessage);
			logger.info(err);
			if(err){
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.recordsFiltered = APCount;
				output.recordsTotal = APCount;	
				output.draw = req.body.draw;		
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						output.data = APs;
												
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of Stranded AP executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of Stranded AP Exception: "+e
		});
	}
});

function getCsvDataParsing(data){
	logger.info("CSV Parsing Data Code Start here");
	var headers = [];
	var fileData = [];
	var splitData = data.split(/\r\n|\n/);
	for (var i = 1; i < splitData.length; i++) {
		if ( splitData[i] == ''){
			splitData.splice(i, 1);
		} 
	}	
	if (splitData[0].includes(';')) {
		headers = splitData[0].split(';')
	} else {
		headers = splitData[0].split(',')
	}	
	if(headers.length != 4){
		return "CSV header must contained only 'apserial, clusterip, apname, zonename'"
	}
	
	for(let i = 0; i<headers.length; i++){
		headers[i] = headers[i].trim();
		if(headers[i] != 'apserial' && i == 0){
			return "First column header name must be 'apserial' in csv"
		}
		if(headers[i] != 'clusterip' && i == 1){
			return "Second column header name must be 'clusterip' in csv"
		}
		if(headers[i] != 'apname' && i == 2){
			return "Third column header name must be 'apname' in csv"
		}
		if(headers[i] != 'zonename' && i == 3){
			return "Fourth column header name must be 'zonename' in csv"
		}
	}
	
	var dataSet = [];
	
	for (var i = 1; i < splitData.length; i++) {
		var newDataObj = {};
		
		if (splitData[i].includes(';')) {
			dataSet = splitData[i].split(';');
		} else {
			dataSet = splitData[i].split(',');
		}
		
		if(dataSet[0].trim()){
			var apserialValid = aputils.serialnumberValidator(dataSet[0].trim());
			if(apserialValid && apserialValid.lengthError){
				return "AP Serial number ["+dataSet[0]+"] length must be 12 digits"
			}
			if(apserialValid && apserialValid.numberError){
				return "AP Serial number ["+dataSet[0]+"] must be numeric 12 digits"
			}
		}else{
			return "AP Serial number is missing in one of row"
		}
		
		if(dataSet[2].trim()){
			var apNameValid = aputils.apNameValidator(dataSet[2].trim());
			if(apNameValid && apNameValid.patternError){
				return "AP ["+dataSet[2]+"] name length must be between 2 and 64"
			}
		}
		if(dataSet[3].trim()){
			var apZoneNameValid = aputils.apZoneValidator(dataSet[3].trim());
			if(apZoneNameValid && apZoneNameValid.patternError){
				return "Zone ["+dataSet[3]+"] name length must be between 2 and 32"
			}
		}	
		for (var j = 0; j < dataSet.length; j++) {
			newDataObj[headers[j]] = dataSet[j].trim();
		}
		fileData.push(newDataObj);
	}
	//console.log(fileData)
	return fileData;
}

module.exports = router;
