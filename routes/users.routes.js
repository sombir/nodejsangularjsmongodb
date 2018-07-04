var express = require('express');
var uuid = require('uuid4');
var fs = require('fs');
var path = require('path');
var router = express.Router();
var logger = require("../config/logger.config");
var DLogger = require("../config/discoverylogger.config");
var UserModel = require('../models/UserModel');
var ClusterModel = require('../models/ClusterModel');
var APIKeyModel = require('../models/APIKeyModel');
var aputils = require('../utils/aputils');
var CommonService = require('./common.service');
var app = express();

const dbErrorMessage = 'Database access error, Please contact administrator or try again';
//get list of users
router.get('/users', function(req, res, next) {
	logger.info("Get list of users API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 10;
		}else{
			var numberofrows = parseInt(req.query.numberofrows);
		}
		if(!req.query.sortby){			
			var sortByColumn = 'creationtime';
		}else{
			var sortByColumn = req.query.sortby;
		}
		if(!req.query.sortorder){			
			var sortOrder = -1;
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
		var queryCount = UserModel.count({$and: [{$or: [ {username: searchTextRegExp}, {email: searchTextRegExp}, {timezones: searchTextRegExp}]},{$or: [ {username: { $exists: true, $ne: "admin"}}]}]});

		//build filter query
		var queryFilter = UserModel.find({$and: [{$or: [ {username: searchTextRegExp}, {email: searchTextRegExp}, {timezones: searchTextRegExp}]},{$or: [ {username: { $exists: true, $ne: "admin" }}]}]}, {backupsettings: false, allowunregisteredap : false, password : false}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, usersCount) {
			if(err){
				logger.info(dbErrorMessage);
				logger.error(err)
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = usersCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, users) {
					if(err){
						logger.info(dbErrorMessage);
						logger.error(err)				
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = startindex > 0 ? (startindex-1)*numberofrows : 0;
						var allRows = users.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = users;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("Get User List : Exception occur when getting list of users")
		logger.error(e)
		return res.json({
			success: false,
			message: "Get list of users Exception: "+e
		});
	}
});


//get user info by username
router.get('/users/:username', function(req, res, next) {
	logger.info("Get user info API start from here");
	try{
		if(req.params.username == ""){
			res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else{
			UserModel.findOne({username: req.params.username}, function (err, userInfo) {
				if(err){ 
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else{
					return res.json({
						success: true,
						data: userInfo
					});
					
				}
			});
		}
	} catch(e){
		logger.info("Get User Info : Exception occur when getting user info")
		logger.error(e)
		return res.json({
			success: false,
			message: "User Get Exception: "+e
		});
	}
});

//create new user
router.post('/users', function(req, res, next) {
	logger.info("Create user API start from here");
	try{
		if(req.body && (req.body.username == "" || req.body.username == undefined)){
			logger.info("Create User : Username is missing in the request")
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else if(req.body && (req.body.password == "" || req.body.password == undefined)){
			logger.info("Create User : Password is missing in the request")
			return res.json({
				success: false,
				message: "Password is missing in the request."
			});
		}else if(req.body && (req.body.email == "" || req.body.email == undefined)){
			logger.info("Create User : Email is missing in the request")
			return res.json({
				success: false,
				message: "Email is missing in the request."
			});
		}else{
			UserModel.findOne({username: req.body.username}, function (err, userInfo) {
				if(err){
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(userInfo && (userInfo.username == req.body.username)){
					logger.info("Create User : Username ["+req.body.username+"] already exists in cds")
					return res.json({
						success: false,
						message: "Username already exists"
					});
				}else{
					
					if(req.body && (req.body.timezones != "" && req.body.timezones != undefined)){
						var newUser = new UserModel({ username: req.body.username, password: req.body.password , email: req.body.email, timezones : req.body.timezones });
					}else{
						var newUser = new UserModel({ username: req.body.username, password: req.body.password , email: req.body.email});
					}
					newUser.save(function (err) {
						if (err){
							logger.info(dbErrorMessage);
							logger.error(err)
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						} else {
							logger.info("Create User : User ["+req.body.username+"] created successfully")
							return res.json({
								success: true,
								message: "User created successfully."
							});
						}								   
					});
				}
			});
		}
	} catch(e){
		logger.info("Create User : Exception occur when creating new user")
		logger.error(e)
		return res.json({
			success: false,
			message: "User Create Exception: "+e
		});
	}
});

//Edit user
router.put('/edituser/:username', function(req, res, next) {
	try{
		logger.info("Edit user API start from here");
		if(req.body && (req.body.username == "" || req.body.username == undefined)){
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else if(req.body && (req.body.password == "" || req.body.password == undefined)){
			return res.json({
				success: false,
				message: "Password is missing in the request."
			});
		}else if(req.body && (req.body.email == "" || req.body.email == undefined)){
			return res.json({
				success: false,
				message: "Email is missing in the request."
			});
		}else{
			var currentDate = new Date();
			var sourceip = aputils.getClientIp(req);
			var action = "Edit"
			var resource = "User"
			var username = req.decoded.username
			var descriptionlog = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : descriptionlog, "username" : username}
			UserModel.findOne({$and: [{username: req.body.username},{username: { $ne: req.params.username }} ]}, function (err, checkUserCount) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(checkUserCount){
					return res.json({
						success: false,
						message: "Username already exists"
					});
				}else{
					UserModel.findOne({username: req.body.username}, function (err, userInfo) {
						if(err){
							logger.info(dbErrorMessage);
							logger.error(err)
							return res.json({
								success: false,
								message: dbErrorMessage
							});					
						}else if(userInfo){
							var usertimezoneflag = userInfo.timezones;

							if(req.body && (req.body.timezones != undefined)){
								usertimezoneflag = req.body.timezones;
							}
							 
							UserModel.findOneAndUpdate({ username: req.params.username }, { username: req.body.username, password: req.body.password , email: req.body.email, timezones : usertimezoneflag, date_updated: currentDate }, function(err, updatedUser) {
								if(err){
									logger.info(dbErrorMessage);
									logger.error(err)
									return res.json({
										success: false,
										message: dbErrorMessage
									});
								}else{							
									logger.info("Edit User : User ["+req.params.username+"] info updated successfully in cds")
									var descriptionlog = 'User {'+req.params.username+'} updated successfully';
									auditLogData.description = descriptionlog
									CommonService.createAuditLog(auditLogData)	
									return res.json({
										success: true,
										message: "User info updated successfully."
									});
								}
							});
						}else{
							logger.info("Edit User : User ["+req.body.username+"] not found in cds")
							return res.json({
								success: true,
								message: "User not found."
							});
						}
					});	
				}
			});			
		}
	} catch(e){
		logger.info("Edit User : Exception occur when updating user")
		logger.error(e)
		return res.json({
			success: false,
			message: "User Update Exception: "+e
		});
	}
});

//update user
router.put('/users/:username', function(req, res, next) {
	try{
		logger.info("Update system settings API start from here");
		if(req.body && (req.body.username == "" || req.body.username == undefined)){
			logger.info("Update System Settings : Username is missing in the request")
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else if(req.body && (req.body.password == "" || req.body.password == undefined)){
			logger.info("Update System Settings : Password is missing in the request")
			return res.json({
				success: false,
				message: "Password is missing in the request."
			});
		}else if(req.body && (req.body.email == "" || req.body.email == undefined)){
			logger.info("Update System Settings : Email is missing in the request")
			return res.json({
				success: false,
				message: "Email is missing in the request."
			});
		}else{
			var currentDate = new Date();
			var sourceip = aputils.getClientIp(req);
			var action = "Edit"
			var resource = "System Settings"
			var username = req.decoded.username
			var descriptionlog = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : descriptionlog, "username" : username}
			UserModel.findOne({username: req.params.username}, function (err, userInfo) {
				if(err){
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(userInfo){
					var allowunregisteredapFlag = userInfo.allowunregisteredap;
					if(req.body && (req.body.allowunregisteredap != "" && req.body.allowunregisteredap != undefined)){
						allowunregisteredapFlag = req.body.allowunregisteredap;
					}
					var usertimezoneflag = userInfo.timezones;
					if(req.body && (req.body.timezone != undefined)){
						usertimezoneflag = req.body.timezone;
					}
					UserModel.findOneAndUpdate({ username: req.params.username }, { username: req.body.username, password: req.body.password , email: req.body.email,allowunregisteredap : allowunregisteredapFlag, timezones : usertimezoneflag, date_updated: currentDate }, function(err, updatedUser) {
						if(err){
							logger.info(dbErrorMessage);
							logger.error(err)
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else{
							if(req.body && (req.body.defaultcluster != "" && req.body.defaultcluster != undefined)){
								let defaultclusterflag = req.body.defaultcluster;
								ClusterModel.update({ }, { defaultcluster: false }, {multi: true}, function(err) {
									if(err){
										logger.info(dbErrorMessage);
										logger.error(err)
										return res.json({
											success: false,
											message: dbErrorMessage
										});
									}else{
										ClusterModel.findOneAndUpdate({ name: defaultclusterflag }, { defaultcluster: true, last_modified: currentDate }, function(err) {
											if(err){
												logger.info(dbErrorMessage);
												logger.error(err)
												return res.json({
													success: false,
													message: dbErrorMessage
												});
											}else{
												logger.info("Update System Settings : System settings updated successfully")
												var descriptionlog = 'System settings updated successfully';
												auditLogData.description = descriptionlog
												CommonService.createAuditLog(auditLogData)	
												return res.json({
													success: true,
													message: "User info updated successfully."
												});
											}
										});
									}
								});
							}else{
								logger.info("Update System Settings : System settings updated successfully")
								var descriptionlog = 'System settings updated successfully';
								auditLogData.description = descriptionlog
								CommonService.createAuditLog(auditLogData)	
								return res.json({
									success: true,
									message: "User info updated successfully."
								});
							}
						}
					});
				}else{
					return res.json({
						success: true,
						message: "User not found."
					});
				}
			});			
		}
	} catch(e){
		logger.info("Update System Settings : Exception occur when updating system settings")
		logger.error(e)
		return res.json({
			success: false,
			message: "User Update Exception: "+e
		});
	}
});

//delete user info by username
router.delete('/users/:username', function(req, res, next) {
	try{
		if(req.params.username == ""){
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}if(req.params.username == "admin"){
			return res.json({
				success: false,
				message: "This action is not allowed on username 'admin'"
			});
		}else{
			UserModel.remove({username: req.params.username}, function (err) {
				if(err){ 
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else{
					logger.info("Delete User : User ["+req.params.username+"] deleted successfully")
					return res.json({
						success: true,
						message: "User deleted successfully"
					});
					
				}
			});
		}
	} catch(e){
		logger.info("Delete User : Exception occur when deleting user ["+req.params.username+"] in cds")
		logger.error(e)
		return res.json({
			success: false,
			message: "User Delete Exception: "+e
		});
	}
});

//get cds build version number
router.get('/appversion', function(req, res, next) {
	try{
		logger.info("Get CDS build version number API start from here");
		if(!process.env.cdsversion){
			logger.info("CDS APP Version : Release version number not found in cds")
			res.json({
				success: false,
				message: 'Release version number not found'
			});
		}else{
			res.json({
				success: true,
				version: process.env.cdsversion
			});
		}
	} catch(e){
		logger.info("CDS APP Version : Exception occur when getting cds release version number")
		logger.error(e)
		return res.json({
			success: false,
			message: "get cds build version number Exception: "+e
		});
	}
});


//Create API Key
router.post('/createapikey', function(req, res, next) {
	try{
		logger.info("Create API token API start from here");
		if(req.body && (req.body.description == "" || req.body.description == undefined)){
			return res.json({
				success: false,
				message: 'API token description is missing in the request.'
			});
		}else{
			var sourceip = aputils.getClientIp(req);
			var action = "Create"
			var resource = "API Token"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
			
			let apikey = uuid()
			let apikeydescription = req.body.description
			let apikeystatus = req.body.status
			let createdby = req.decoded.username
			var newApiKey = new APIKeyModel({ key: apikey, description : apikeydescription, status : apikeystatus, username: createdby});
			newApiKey.save(function (err) {
				if (err){
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else{
					auditLogData.description = 'New API token created successfully'
					CommonService.createAuditLog(auditLogData)
					return res.json({
						success: true,
						message: 'API token created successfully'
					});
				}
			})
		}
	} catch(e){
		logger.info("Create API token executed catch : "+e);
		return res.json({
			success: false,
			message: "Create API token Exception: "+e
		});
	}
});

//Update API Key
router.put('/updateapikey/:keyId', function(req, res, next) {
	try{
		logger.info("Update API token API start from here");
		let apikey = req.params.keyId
		var currentDate = new Date();
		if(req.body && (req.body.description == "" || req.body.description == undefined)){
			return res.json({
				success: false,
				message: 'API token description is missing in the request.'
			});
		}else if(!apikey){
			return res.json({
				success: false,
				message: 'API token is missing in the request.'
			});
		}else{
			var sourceip = aputils.getClientIp(req);
			var action = "Edit"
			var resource = "API Token"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
			APIKeyModel.findOne({key: apikey}, function (err, keyInfo) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(keyInfo){
					let apikeydescription = req.body.description
					let apikeystatus = req.body.status
					let createdby = req.decoded.username
					let lastModified = currentDate
					APIKeyModel.findOneAndUpdate({ key: apikey }, {description: apikeydescription, status: apikeystatus , last_modified: lastModified }, function(err){
						if(err){
							logger.info(dbErrorMessage);
							logger.info(err);
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else{	
							auditLogData.description = 'API token ['+apikey+'] updated successfully'
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: true,
								message: 'API token updated successfully'
							});
						}
					})
				}else{
					return res.json({
						success: false,
						message: 'Specified API token not found.'
					});
				}
			})
		}
	} catch(e){
		logger.info("Update API token executed catch : "+e);
		return res.json({
			success: false,
			message: "Update API token Exception: "+e
		});
	}
});

//Delete API Key
router.delete('/deleteapikey/:keyId', function(req, res, next) {
	try{
		logger.info("Delete API token API start from here");
		let apikey = req.params.keyId
		if(!apikey){
			return res.json({
				success: false,
				message: 'API token is missing in the request.'
			});
		}else{
			var sourceip = aputils.getClientIp(req);
			var action = "Delete"
			var resource = "API Token"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
			APIKeyModel.findOne({key: apikey}, function (err, keyInfo) {
				if(err){
					logger.info(dbErrorMessage);
					logger.info(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(keyInfo){
					APIKeyModel.remove({ key: apikey }, function(err){
						if(err){
							logger.info(dbErrorMessage);
							logger.info(err);
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else{	
							auditLogData.description = 'API token ['+apikey+'] deleted successfully'
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: true,
								message: 'API token deleted successfully'
							});
						}
					})
				}else{
					return res.json({
						success: false,
						message: 'Specified API token not found.'
					});
				}
			})
		}
	} catch(e){
		logger.info("Delete API token executed catch : "+e);
		return res.json({
			success: false,
			message: "Delete API token Exception: "+e
		});
	}
});

//Bulk delete API Keys
router.delete('/bulkdeleteapikey/:keyIds', function(req, res, next) {
	try{
		logger.info("Bulk delete API token API start from here");
		let apikeys = req.params.keyIds
		if(apikeys == "" || apikeys == undefined){
			res.json({
				success: false,
				message: 'API tokens missing in the request.'
			});
		}else{
			var apikeysArr = apikeys.split(",");
			var ApiFailed = 0;
			var ApiSuccess = 0;
			var resmessage = "";
			var loopCount = 1;
			var sourceip = aputils.getClientIp(req);
			var action = "Bulk Delete"
			var resource = "API Token"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}	
			apikeysArr.forEach(function(apikey) {
				APIKeyModel.remove({ key: apikey }, function(err){
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						ApiFailed = ApiFailed + 1;
						resmessage = ApiSuccess+" API tokens deleted, "+ApiFailed+" API tokens failed to delete"; 
						if(loopCount == apikeysArr.length){
							auditLogData.description = resmessage
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: false,
								message: resmessage
							});
						}
						loopCount = loopCount + 1;
					}else{	
						ApiSuccess = ApiSuccess + 1;
						resmessage = ApiSuccess+" API tokens deleted, "+ApiFailed+" API tokens failed to delete";
						if(loopCount == apikeysArr.length){
							auditLogData.description = resmessage
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: true,
								message: resmessage
							});
						}
						loopCount = loopCount + 1;
					}
				})
			});	
		}
	} catch(e){
		logger.info("Bulk delete API token executed catch : "+e);
		return res.json({
			success: false,
			message: "Bulk delete API token Exception: "+e
		});
	}
});


//Bulk update API Keys
router.put('/bulkupdateapikey/:keyIds/:status', function(req, res, next) {
	try{
		logger.info("Bulk update API token API start from here");
		console.log(req.params)
		
		let apikeys = req.params.keyIds
		let apikeystatus = req.params.status
		if(apikeys == "" || apikeys == undefined){
			res.json({
				success: false,
				message: 'API tokens missing in the request.'
			});
		}else if(apikeystatus != "Active" && apikeystatus != "Suspended"){
			res.json({
				success: false,
				message: 'API token status missing in the request or not a valid status.'
			});
		}else{
			var apikeysArr = apikeys.split(",");
			var ApiFailed = 0;
			var ApiSuccess = 0;
			var resmessage = "";
			var loopCount = 1;
			var sourceip = aputils.getClientIp(req);
			var action = "Bulk Update"
			var resource = "API Token"
			var username = req.decoded.username
			var description = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}	
			apikeysArr.forEach(function(apikey) {
				var currentDate = new Date();
				APIKeyModel.findOneAndUpdate({ key: apikey }, {status: apikeystatus , last_modified: currentDate }, function(err){
					if(err){
						logger.info(dbErrorMessage);
						logger.info(err);
						ApiFailed = ApiFailed + 1;
						resmessage = ApiSuccess+" API token's status updated, "+ApiFailed+" API token's status update failed"; 
						if(loopCount == apikeysArr.length){
							auditLogData.description = resmessage
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: false,
								message: resmessage
							});
						}
						loopCount = loopCount + 1;
					}else{	
						ApiSuccess = ApiSuccess + 1;
						resmessage = ApiSuccess+" API token's status updated, "+ApiFailed+" API token's status update failed"; 
						if(loopCount == apikeysArr.length){
							auditLogData.description = resmessage
							CommonService.createAuditLog(auditLogData)
							return res.json({
								success: true,
								message: resmessage
							});
						}
						loopCount = loopCount + 1;
					}
				})
			});	
		}
	} catch(e){
		logger.info("Bulk update API token executed catch : "+e);
		return res.json({
			success: false,
			message: "Bulk update API token Exception: "+e
		});
	}
});

//get list of api keys
router.get('/apikeyslist', function(req, res, next) {
	logger.info("Get list of api tokens API start from here");
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
			var sortByColumn = 'activitytime';
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
		var queryCount = APIKeyModel.count({ $or: [ {key: searchTextRegExp}, {description: searchTextRegExp}, {status: searchTextRegExp}, {username: searchTextRegExp} ]});
		
		//build filter query
		var queryFilter = APIKeyModel.find({ $or: [ {key: searchTextRegExp}, {description: searchTextRegExp}, {status: searchTextRegExp}, {username: searchTextRegExp} ]}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, activitiesCount) {
			if(err){
				logger.info(dbErrorMessage);
				logger.error(err)
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = activitiesCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, activities) {
					if(err){
						logger.info(dbErrorMessage);
						logger.error(err)
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = startindex != 0 ? (startindex-1)*numberofrows : 0;
						var allRows = activities.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = activities;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of api tokens executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of api tokens Exception: "+e
		});
	}
});

//update back process schedule
router.put('/backprocessscheduler/:username', function(req, res, next) {
	logger.info("Create back process scheduler API start from here");
	try{
		let IsEnabled = false
		let isenabledbody = req.body.enabled.toString()
		if(isenabledbody.toLowerCase() == "true" || isenabledbody.toLowerCase() == true){
			IsEnabled = true
		}
		let frequencyArr = ['15min', '30min', '1hr', '12hr', '24hr', '7days']
		if(req.body && (req.params.username == "" || req.params.username == undefined)){
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else if(req.body && (req.body.frequency == "" || req.body.frequency == undefined) && IsEnabled){
			return res.json({
				success: false,
				message: 'Frequency is missing in the request.'
			});
		}else if(!frequencyArr.includes(req.body.frequency) && req.body.frequency != "" && req.body.frequency != undefined){
			return res.json({
				success: false,
				message: "Please enter valid frequency ['15min', '30min', '1hr', '12hr', '24hr', '7days'] in the request."
			});
		}else{
			UserModel.findOne({username: req.params.username}, function (err, userInfo) {
				if(err){
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});	
				}else{
					var currentDate = new Date();
					var sourceip = aputils.getClientIp(req);
					var action = "Update"
					var resource = "Back Process"
					var username = req.decoded.username
					var descriptionlog = ""
					const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : descriptionlog, "username" : username}
					
					let frequency = req.body.frequency
					let schedulerValue = ''
					if(frequency == '15min'){
						schedulerValue = '*/15 * * * *'
					}else if(frequency == '30min'){
						schedulerValue = '*/30 * * * *'
					}else if(frequency == '1hr'){
						schedulerValue = '00 */1 * * *'
					}else if(frequency == '12hr'){
						schedulerValue = '00 */12 * * *'
					}else if(frequency == '24hr'){
						schedulerValue = '00 00 */1 * *'
					}else if(frequency == '7days'){
						schedulerValue = '00 00 * * */1'
					}else{
						schedulerValue = '*/15 * * * *'
					}
					let backProcessSettingsVal = {"changed" : true, "enabled" : IsEnabled, "frequency" : schedulerValue}
					UserModel.findOneAndUpdate({ username: req.params.username }, { backprocesssettings : backProcessSettingsVal, date_updated: currentDate }, function(err, updatedUser) {
						if(err){
							logger.info(dbErrorMessage);
							logger.error(err)
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else{							
							logger.info("User back process settings info updated successfully in cds")
							var descriptionlog = 'User back process settings updated successfully';
							auditLogData.description = descriptionlog
							CommonService.createAuditLog(auditLogData)	
							return res.json({
								success: true,
								message: "User back process settings info updated successfully."
							});
						}
					});
				}
			});
		}
	} catch(e){
		logger.info("Exception occur when updating back process settings info")
		logger.error(e)
		return res.json({
			success: false,
			message: "Exception occur when updating back process settings info"
		});
	}
});

//update logger configuration
router.put('/logsconfigurations/:username', async(req, res, next) => {
	logger.info("Update logger configuration API start from here");
	try{
		let logSeverity = ['error', 'warn', 'info', 'debug']
		let logFileSizes = [5, 10]
		let logMaxFiles = [1,2,3,4,5,6,7,8,9,10]
		var currentDate = new Date();
		let fileLogsLevel = req.body.filelogseverity ? req.body.filelogseverity : ''
		let maxFileSize = req.body.filelogssize ? parseInt(req.body.filelogssize) : 0
		let maxNumberOfFiles = req.body.maxlogfiles ? parseInt(req.body.maxlogfiles) : 0
		if(req.body && (req.params.username == "" || req.params.username == undefined)){
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else if(req.body && (req.body.filelogseverity == "" || req.body.filelogseverity == undefined)){
			return res.json({
				success: false,
				message: 'File logs severity is missing in the request.'
			});
		}else if(!logSeverity.includes(req.body.filelogseverity) && req.body.filelogseverity != "" && req.body.filelogseverity != undefined){
			return res.json({
				success: false,
				message: 'Please enter valid file logs severity in the request.'
			});
		}else if(req.body && (req.body.filelogssize == "" || req.body.filelogssize == undefined)){
			return res.json({
				success: false,
				message: 'Logs filesize is missing in the request.'
			});
		}else if(req.body && req.body.filelogssize != "" && req.body.filelogssize != undefined && !logFileSizes.includes(maxFileSize)){
			return res.json({
				success: false,
				message: 'Logs filesize should be numeric and allowed values are [5,10]'
			});
		}else if(req.body && (req.body.maxlogfiles == "" || req.body.maxlogfiles == undefined)){
			return res.json({
				success: false,
				message: 'Number of log files is missing in the request.'
			});
		}else if(req.body && req.body.maxlogfiles != "" && req.body.maxlogfiles != undefined && !logMaxFiles.includes(maxNumberOfFiles)){
			return res.json({
				success: false,
				message: 'Number of log files should be numeric and allowed values are [1,2,3,4,5,6,7,8,9,10]'
			});
		}else{
			let logsConfigSettings = {"changed" : true, "severity" : fileLogsLevel, "filesize" : maxFileSize, "maxfiles" : maxNumberOfFiles}
			var sourceip = aputils.getClientIp(req);
			var action = "Update"
			var resource = "Logs Config"
			var username = req.decoded.username
			var descriptionlog = ""
			const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : descriptionlog, "username" : username}
			UserModel.findOneAndUpdate({ username: req.params.username }, { logsconfig : logsConfigSettings, date_updated: currentDate }, function(err) {
				if(err){
					logger.info(dbErrorMessage);
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else{							
					logger.info("Application logs settings updated successfully in cds")
					var descriptionlog = 'Application logs settings updated successfully';
					auditLogData.description = descriptionlog
					CommonService.createAuditLog(auditLogData)	
					
					if(fileLogsLevel){
						logger.transports['file'].level = fileLogsLevel	
						DLogger.transports['file'].level = fileLogsLevel	
					}
					if(maxFileSize){
						let fileSizeInBytes = maxFileSize*1000000 // (1MB -> 1000000)
						logger.transports['file'].maxsize = fileSizeInBytes	
						DLogger.transports['file'].maxsize = fileSizeInBytes	
					}
					if(maxNumberOfFiles){
						logger.transports['file'].maxFiles = maxNumberOfFiles	
						DLogger.transports['file'].maxFiles = maxNumberOfFiles	
					}
					
					return res.json({
						success: true,
						message: "Application logs settings updated successfully."
					});
				}
			});
		}
	} catch(e){
		logger.info("Exception occur when updating application logs settings")
		logger.error(e)
		if (e.name === 'MongoError') {
			return res.json({
				success: false,
				message: dbErrorMessage
			});
		}else{
			return res.json({
				success: false,
				message: "Exception occur when updating application logs settings"
			});
		}
	}
});

//Get list of logs files
router.get('/applicationlogs', async(req, res, next) => {
	logger.info("Get list of logs files API start from here");
	try{
		let logsFilePath = logger.transports['file'].dirname
		let logsFileName = logger.transports['file']._basename
		let logsLevel = logger.transports['file'].level
		let logsStatus = 'Enabled'
		let files = fs.readdirSync(logsFilePath);
		let LogsTypeList = [{"type" : "webui", "logstype" : "Web Logs", "files" : [], "numberoffiles" : 0, 'level' : logsLevel, 'status' : logsStatus, 'filepath' : logsFilePath}, {"type" : "backprocess", "logstype" : "Periodic Synch Up process", "files" : [], "numberoffiles" : 0, 'level' : logsLevel, 'status' : logsStatus, 'filepath' : logsFilePath}, {"type" : "discovery", "logstype" : "Discovery Logs", "files" : [], "numberoffiles" : 0, 'level' : logsLevel, 'status' : logsStatus, 'filepath' : logsFilePath}]
		let webUiLogsArr = []
		let backProcessLogsArr = []
		let DisProcessLogsArr = []
		files.forEach(function(file) {
			if (file.includes('cds-app')) {
				var fileArr = file.split('-')
				var timestamp = fileArr[2] ? parseInt(fileArr[2]) : ''
				var formatedTime = aputils.convertTimesatampToDate(timestamp)
				var formatedFileName = formatedTime ? fileArr[0]+'-'+fileArr[1]+'-'+formatedTime+'.log' : file
				const fileAttr = {
					name : file,
					formatedName : formatedFileName
				}
				webUiLogsArr.push(fileAttr)	
			}else if (file.includes('back-process')) {
				var fileArr = file.split('-')
				var timestamp = fileArr[2] ? parseInt(fileArr[2]) : ''
				var formatedTime = aputils.convertTimesatampToDate(timestamp)
				var formatedFileName = formatedTime ? fileArr[0]+'-'+fileArr[1]+'-'+formatedTime+'.log' : file
				const fileAttr = {
					name : file,
					formatedName : formatedFileName
				}
				backProcessLogsArr.push(fileAttr)
			}else if (file.includes('discovery')) {
				var fileArr = file.split('-')
				var timestamp = fileArr[1] ? parseInt(fileArr[1]) : ''
				var formatedTime = aputils.convertTimesatampToDate(timestamp)
				var formatedFileName = formatedTime ?  fileArr[0]+'-'+formatedTime+'.log' : file
				const fileAttr = {
					name : file,
					formatedName : formatedFileName
				}
				DisProcessLogsArr.push(fileAttr)
			}
		});	
		LogsTypeList.forEach(function(logTypeInfo) {
			if (logTypeInfo.type == 'webui') {
				logTypeInfo.files = webUiLogsArr
				logTypeInfo.numberoffiles = webUiLogsArr.length ? webUiLogsArr.length : 0
			}else if (logTypeInfo.type == 'backprocess') {
				logTypeInfo.files = backProcessLogsArr
				logTypeInfo.numberoffiles = backProcessLogsArr.length ? backProcessLogsArr.length : 0
			}else if (logTypeInfo.type == 'discovery') {
				logTypeInfo.files = DisProcessLogsArr
				logTypeInfo.numberoffiles = DisProcessLogsArr.length ? DisProcessLogsArr.length : 0
			}
		});	
		if(files && LogsTypeList){
			return res.json({
				success: true,
				data: LogsTypeList
			});
		}else{
			return res.json({
				success: false,
				message: "Error when getting list of logs files"
			});
		}
	} catch(e){
		logger.info("Exception occur when getting list of logs files")
		logger.error(e)
		return res.json({
			success: false,
			message: "Exception occur when getting list of logs files"
		});
	}
});


//Download application logs file
router.get('/applicationlogs/download/:filename', function(req, res, next) {
	try{
		logger.info("Download application logs files API start from here");
		let logfilename = req.params.filename
		if((logfilename == "" || logfilename == undefined)){
			logger.info("Download application logs file : Filename is missing in the request")
			res.json({
				success: false,
				message: 'Filename is missing in the request.'
			});
		}else{
			let logsFilePath = logger.transports['file'].dirname
			let filepathcds = path.join(logsFilePath, logfilename)
			if (fs.existsSync(filepathcds)) {
				let filedata = fs.readFileSync(filepathcds)
				let filebody = new Buffer(filedata).toString('base64');	
				const fileInfoCust = { filename : logfilename, data : filebody}
				res.setHeader('Content-disposition', 'attachment; filename='+logfilename+'');
				res.download(filepathcds); 
				return res.json({
					success: true,
					data: fileInfoCust
				})			
			}else{
				return res.json({
					success: false,
					message: "Log file not found on cds server, please refresh the list before retrying"
				});
			}
		}
	} catch(e){
		logger.info("Exception occur when downloading log file")
		logger.error(e)
		return res.json({
			success: false,
			message: "Exception occur when downloading log file"
		});
	}
});

//Download all logs files as zip
router.get('/applicationlogs/downloadallfiles/:type?', async(req, res, next) => {
	logger.info("Download all logs files as zip API start from here");
	try{
		let selectedLogType = req.params.type ? req.params.type : ''
		let logsFileDir = logger.transports['file'].dirname
		let logsZipFileName = 'cds-logs-archive.zip'
		let logsZipFileDir = '/tmp'
		var zip=require('adm-zip');
		var zipper = new zip();
		let files = fs.readdirSync(logsFileDir);
		files.forEach(function(file) {
			let logfilepathcds = path.join(logsFileDir, file)
			if(selectedLogType == 'webui'){
				if (file.includes('cds-app')) {
					zipper.addLocalFile(logfilepathcds);	
				}
			}else if(selectedLogType == 'backprocess'){
				if (file.includes('back-process')) {
					zipper.addLocalFile(logfilepathcds);	
				}
			}else if(selectedLogType == 'discovery'){
				if (file.includes('discovery')) {
					zipper.addLocalFile(logfilepathcds);	
				}
			}else{
				zipper.addLocalFile(logfilepathcds);	
			}
		});	
		let zipfilepathcds = path.join(logsZipFileDir, logsZipFileName)
		zipper.writeZip(zipfilepathcds);
		if (fs.existsSync(zipfilepathcds)) {
			let filedata = fs.readFileSync(zipfilepathcds)
			let filebody = new Buffer(filedata).toString('base64');	
			const fileInfoCust = { filename : logsZipFileName, data : filebody}
			fs.unlinkSync(zipfilepathcds) // delete the local file	
			return res.json({
				success: true,
				data: fileInfoCust
			})			
		}else{
			return res.json({
				success: false,
				message: "Error while creating log's zip archive, please refresh the list before retrying"
			});
		}
	} catch(e){
		logger.info("Exception occur when downloading all logs")
		logger.error(e)
		return res.json({
			success: false,
			message: "Exception occur when downloading all logs"
		});
	}
});

module.exports = router;
