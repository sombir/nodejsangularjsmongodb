var express = require('express')
var router = express.Router()
var app = express()
var logger = require("../config/logger.config")
var UserModel = require('../models/UserModel')
var ClusterModel = require('../models/ClusterModel')
var BackupHistoryModel = require('../models/BackupHistoryModel')
var Backup34 = require('../szcomm/backup34')
var Backup35 = require('../szcomm/backup35')
var Connection = require('../szcomm/connection')
var Restore = require('../szcomm/restore')
var configbackup = require('../szcomm/configbackup');
var ftpHelper = require('../utils/ftp-helper');
var aputils = require('../utils/aputils');
var CommonService = require('./common.service');
const _ = require('lodash')
var fs = require('fs');
var path = require('path');
var multer = require("multer");
const exec = require('child_process').exec;
var mkdirp = require('mkdirp');
const dbErrorMessage = "Database access error, please contact administrator or try again"

//take manual config backup 
router.post('/manualconfigbackup/:ipaddress', async(req, res, next) => {
	logger.info("Start manual configuration backup API start from here")
	let settings = null
	var view = this;
    Connection.connections = {}
	view.tasks = {}
    settingInfo = await UserModel.findOne({username : 'admin'});	
	const setting = {"id" : settingInfo._id, "scheduleEnabled" : settingInfo.backupsettings.enabled, "scheduleCron" : settingInfo.backupsettings.frequency, "storageType" : {"cds": settingInfo.backupsettings.backuptype.cds, "tftp" : settingInfo.backupsettings.backuptype.tftp}, "localDir" : settingInfo.backupsettings.localDir, "remoteDir" : settingInfo.backupsettings.tftpserver.remotedir, "maxBackupPerController" : settingInfo.backupsettings.maxbackup, "tftp" : settingInfo.backupsettings.tftpserver }
	 
	let description = 'Manually triggered backup'
	if(req.body && (req.body.description != "" && req.body.description != undefined)){
		description = req.body.description;
	}
	let clusterIp = req.params.ipaddress;
	var sourceip = aputils.getClientIp(req);
	var action = "Create"
	var resource = "Config Backup"
	var username = req.decoded.username
	var descriptionlog = ""
	const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : descriptionlog, "username" : username}
	if(clusterIp == "" || clusterIp == undefined){
		logger.info("Config Backup : Cluster IP is missing in the request")
		return res.json({
			success: false,
			message: 'Cluster IP is missing in the request.'
		})
	}else{
		let totalsize = 0
		let totalSizeInGB = 0
		backupFileSize = await BackupHistoryModel.find({backupStatus : 'Ok'}, {filesize: 1});
		_.forEach(backupFileSize, async (size) => {
			 totalsize = totalsize + parseInt(size.filesize)
		})
		totalSizeInGB = (parseInt(totalsize) / 1073741824).toFixed(2)
		logger.info("Config Backup : Total file size of all config backup files is ["+totalSizeInGB+"GB]")
		if(totalSizeInGB >= 5){			
			return res.json({
				success: false,
				message: 'Total size (5GB) of all config backup files exceed, first delete some older config files then try to download'
			})
		}
		cluserInfo = await ClusterModel.findOne({ip : clusterIp});	
		if (!cluserInfo) {
			logger.info("Config Backup : Cluster IP ["+clusterIp+"] not found in the cds")
			return res.json({
				success: false,
				message: 'Cluster IP not found in the cds.'
			})
		}else{
			configbackup.manualconfigbackup(clusterIp, setting, description, function(error, message, backupId){
			  if(error){
				logger.info('Config backup failed with error : ' + message)
				var descriptionlog = 'Cluster ['+clusterIp+'] manual config backup failed';
				auditLogData.description = descriptionlog
				CommonService.createAuditLog(auditLogData)	
				return res.json({
					success: false,
					message: 'Config backup failed with error : ' + message
				})
			  }else{
				logger.info('Manual configuration backup started successfully for controller '+cluserInfo.name+', We will notify you once file is ready to download')
				var descriptionlog = 'Manual configuration backup started successfully for controller '+cluserInfo.name;
				auditLogData.description = descriptionlog
				CommonService.createAuditLog(auditLogData)	
				return res.json({
					success: true,
					backupId: backupId,
					message: 'Manual configuration backup started successfully for controller '+cluserInfo.name+', We will notify you once file is ready to download'
				})
			  }
			})
		}
	}
});

//get list of config back history
router.get('/backuphistory', function(req, res, next) {
	logger.info("Get list of config back history API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 100;
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
			var sortByColumn = 'backupTimestamp';
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
		var searchTextRegExp = new RegExp(searchText,'i');
		
		//build count query
		var queryCount = BackupHistoryModel.count({ $or: [ {description: searchTextRegExp}, {backupStatus: searchTextRegExp}, {backupProgress: searchTextRegExp}, {backuptype: searchTextRegExp}, {filename: searchTextRegExp}, {version: searchTextRegExp} ]});
		
		//build filter query
		var queryFilter = BackupHistoryModel.find({ $or: [ {description: searchTextRegExp}, {backupStatus: searchTextRegExp}, {backupProgress: searchTextRegExp}, {backuptype: searchTextRegExp}, {filename: searchTextRegExp}, {version: searchTextRegExp} ]}, {file: false}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, configHistoryCount) {
		  if(err){
				logger.info(dbErrorMessage)
				logger.error(err)
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, configHistories) {
					if(err){
						logger.info(dbErrorMessage)
						logger.error(err)				
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						let historyArray = []
						ClusterModel.find({},{ip : 1, name : 1, status : 1, stats : 1}, function (err, clusters) {
							if(err){
								logger.info(dbErrorMessage)
								logger.error(err)
								return res.json({
									success: false,
									message: dbErrorMessage
								});								
							}else{
								let counter = 0
								_.forEach(clusters, async (cluster) => {
									const historyA = {
										id : cluster.id,
										ip : cluster.ip,
										name : cluster.name,
										status : cluster.status,
										version : cluster.stats ? (cluster.stats.systemsummary ? cluster.stats.systemsummary.version : '' ) : 'N/A',
										backuphistory : []
									}
									_.forEach(configHistories, async (Histories) => {
										if(Histories.clusterId == historyA.id ){
											historyA.backuphistory.push(Histories)
										}
									})
									historyArray.push(historyA)
									counter++
									if(counter == clusters.length){
										return res.json({
											success: true,
											data: historyArray
										});
									}
								})
							}
						})
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of config back history executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of config back history Exception: "+e
		});
	}
});


//get list of config back history of a specified cluster IP
router.get('/clusterbackuphistory/:ipaddress', async(req, res, next) => {
	logger.info("Get list of config back history API start from here");
	try{
		let controller
		let controllerIp = req.params.ipaddress
		if(controllerIp != "" && controllerIp != undefined){
			controller = await ClusterModel.findOne({ip : controllerIp }, {_id: true, ip : true})
			if(!controller){
				logger.info("Config Backup History : The cluster specified by the IP (" + controllerIp + ") not found in cds")
				return res.json({
					success: false,
					message: 'The cluster specified by the IP (' + controllerIp + ') cannot be found'
				});
			}
		}else{
			logger.info("Config Backup History : Cluster IP missing in the request")
			return res.json({
				success: false,
				message: 'Cluster IP missing in the request.'
			});
		}
		let controllerId = controller.id
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
			var sortByColumn = 'backupTimestamp';
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
		var queryCount = BackupHistoryModel.count({$and: [{ $or: [ {description: searchTextRegExp}, {backupStatus: searchTextRegExp}, {backupProgress: searchTextRegExp}, {backuptype: searchTextRegExp}, {filename: searchTextRegExp}, {version: searchTextRegExp} ]},{clusterId: controllerId} ]});
		
		//build filter query
		var queryFilter = BackupHistoryModel.find({$and: [{ $or: [ {description: searchTextRegExp}, {backupStatus: searchTextRegExp}, {backupProgress: searchTextRegExp}, {backuptype: searchTextRegExp}, {filename: searchTextRegExp}, {version: searchTextRegExp} ]},{clusterId: controllerId} ]}, {file: false}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, configHistoryCount) {
		  if(err){
				logger.info(dbErrorMessage)
				logger.error(err)	
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				output.totalCount = configHistoryCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, configHistories) {
					if(err){
						logger.info(dbErrorMessage)
						logger.error(err)				
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = startindex > 0 ? (startindex-1)*numberofrows : 0;
						var allRows = configHistories.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = configHistories;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("Config Backup History : Exception occur when searching for config backups in cds")
		logger.error(e)
		return res.json({
			success: false,
			message: "Get list of config back history Exception: "+e
		});
	}
});

//delete Backup History info by clusterId
router.delete('/deletebackuphistory/:configId', function(req, res, next) {
	logger.info("Delete Cluster Backup History API start from here");
	try{
		var sourceip = aputils.getClientIp(req);
		var action = "Delete"
		var resource = "Delete Config Backup"
		var username = req.decoded.username
		var descriptionlog = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : descriptionlog, "username" : username}
		if(req.params.configId == "" || req.params.configId == undefined){
			logger.info("Delete Config Backup : Cluster config backup file id is missing in the request")
			res.json({
				success: false,
				message: 'Cluster config backup file id is missing in the request.'
			});
		}else{
			let configId = req.params.configId
			const configBackupId = configId.toString(); 
			BackupHistoryModel.findOne({_id: configBackupId}, function(err, backup) {
				if(err){
					logger.info(dbErrorMessage)
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else if(!backup){
					logger.info("Delete Config Backup : Specified backup id ["+configBackupId+"] not found in cds when deleting config backup");
					return res.json({
						success: false,
						message: "Specified backup id ["+configBackupId+"] not found in cds when deleting config backup"
					});
				}else{
					BackupHistoryModel.remove({_id: backup.id}, function (err) {
						if(err){ 
							logger.info(dbErrorMessage)
							logger.error(err)
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else{
							logger.info("Delete Config Backup : config backup file ["+backup.filename+"] deleted successfully")
							if(backup.backuptype.cds && backup.cdsfileDir && backup.filename){
								let filepathcds = path.join(backup.cdsfileDir, backup.filename)
								if (fs.existsSync(filepathcds)) {
									fs.unlinkSync(filepathcds) // delete the local file	
								}
							}
							var description = "Cluster config backup file ["+backup.filename+"] deleted successfully"
							auditLogData.description = description
							CommonService.createAuditLog(auditLogData)	
							return res.json({
								success: true,
								message: "Cluster config backup file deleted successfully"
							});
							
						}
					});
				}
			})	
		}
	} catch(e){
		logger.info("Delete Config Backup : Exception occur when deleting backup file")
		logger.error(e)
		return res.json({
			success: false,
			message: "Delete Cluster Backup History Delete Exception: "+e
		});
	}
});

//Edit backup Settings
router.put('/editbackupsettings/:username', async(req, res, next) => {
	try{
		logger.info("Edit backup Settings API start from here");
		var frequency = '0 0 * * *';
		var backupSettings = "";
		var daily = "*";
		var weekly = "*";
		var monthly = "*";
		var scheduledEnabled = false;
		var backuptypecds = false;
		var backuptypesftp = false;
		var currentDate = new Date();
		var sourceip = aputils.getClientIp(req);
		var action = "Edit"
		var resource = "Backup Settings"
		var username = req.decoded.username
		var description = ""
		const auditLogData = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
		if((req.params.username == "" || req.params.username == undefined)){
			logger.info("Edit Backup Settings : Username is missing in the request")
			return res.json({
				success: false,
				message: 'Username is missing in the request.'
			});
		}else if(req.body && (req.body.backuptypecds != "true" && req.body.backuptypecds != true) && (req.body.backuptypesftp != "true" && req.body.backuptypesftp != true)){
			logger.info("Edit Backup Settings : At least one field is required from backup type CDS or SFTP")
			return res.json({
				success: false,
				message: "At least one field is required from backup type CDS or SFTP."
			});
		}else if(req.body && ((req.body.daily != "true" && req.body.daily != true) && (req.body.weekly != "true" && req.body.weekly != true) && (req.body.monthly != "true" && req.body.monthly != true))){
			logger.info("Edit Backup Settings : At least one field is required from daily, weekly or monthly")
			return res.json({
				success: false,
				message: "At least one field is required from daily, weekly or monthly."
			});
				
		}else if((req.body.backuptypesftp == "true" || req.body.backuptypesftp == true) && (req.body.host == "" || req.body.host == undefined)){
			logger.info("Edit Backup Settings : Host name is missing in the request")
			return res.json({
				success: false,
				message: "Host name is missing in the request."
			});
		}else if((req.body.backuptypesftp == "true" || req.body.backuptypesftp == true) && (req.body.port == "" || req.body.port == undefined)){
			logger.info("Edit Backup Settings : At least one field is required from daily, weekly or monthly")
			return res.json({
				success: false,
				message: "Port number is missing in the request."
			});
		}else if((req.body.backuptypesftp == "true" || req.body.backuptypesftp == true) && (req.body.username == "" || req.body.username == undefined)){
			logger.info("Edit Backup Settings : Sftp username is missing in the request")
			return res.json({
				success: false,
				message: "Sftp username is missing in the request."
			});
		}else if((req.body.backuptypesftp == "true" || req.body.backuptypesftp == true) && (req.body.password == "" || req.body.password == undefined)){
			logger.info("Edit Backup Settings : Sftp password is missing in the request")
			return res.json({
				success: false,
				message: "Sftp password is missing in the request."
			});
		}else{
			scheduledEnabled = (req.body.enabled == "true" || req.body.enabled == true) ? true : false
			backuptypecds = (req.body.backuptypecds == "true" || req.body.backuptypecds == true) ? true : false
			backuptypesftp = (req.body.backuptypesftp == "true" || req.body.backuptypesftp == true) ? true : false
			daily = (req.body.daily == "true" || req.body.daily == true) ? '1-31' :  '*' 
			weekly = (req.body.weekly == "true" || req.body.weekly == true) ? '0' :  '*' 
			monthly = (req.body.monthly == "true" || req.body.monthly == true) ? '1-12' :  '*' 
			frequency = '59 23 '+daily+' '+monthly+' '+weekly
			//frequency = '40 11 1-31 * *'
			if(backuptypesftp){
				var host = req.body.host ? req.body.host : ""
				var port = req.body.port ? req.body.port : ""
				var ftpusername = req.body.username ? req.body.username : ""
				var ftppassword = req.body.password ? req.body.password : ""
				var remotedir = req.body.remotedir ? req.body.remotedir : '/tmp'
				backupSettings = {"backupsettings" : {"enabled" : scheduledEnabled, "frequency" : frequency, "backuptype" : { "cds" : backuptypecds, "tftp" : backuptypesftp } , "maxbackup" : 3, "localDir" : "/tmp", "tftpserver" : { "type" : "sftp", "host" : host, "port" : port, "username" : ftpusername, "password" : ftppassword, "remotedir" : remotedir } }, date_updated: currentDate }

			  const ftpconfig = { "type" : "sftp", "host" : host, "port" : port, "username" : ftpusername, "password" : ftppassword}
			  const file = 'testFtp.txt'
			  let operation = 'Test FTP Connection'
			  ftpHelper.ftpUpload(file, remotedir, file, ftpconfig)
				.then(() => {
					if(backupSettings){
						UserModel.findOne({username: req.params.username}, function (err, userInfo) {
							if(err){
								logger.info(dbErrorMessage)
								logger.error(err)
								return res.json({
									success: false,
									message: dbErrorMessage
								});					
							}else if(userInfo){
								UserModel.findOneAndUpdate({ username: req.params.username }, backupSettings, async(err) => {
									if(err){
										logger.info(dbErrorMessage)
										logger.error(err)
										var description = "Error found during update backup settings :"+err
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)	
										return res.json({
											success: false,
											message: dbErrorMessage
										});
									}else{
										logger.info("Edit Backup Settings : Backup Settings updated successfully")
										var description = "Backup Settings updated successfully"
										auditLogData.description = description
										CommonService.createAuditLog(auditLogData)	
										return res.json({
											success: true,
											message: "Backup Settings updated successfully"
										});
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
				}).catch ((error) => {
				  logger.info('Edit Backup Settings : operation (%s) failed with error (%s)', operation, error.message)
				  logger.error(error)
				  return res.json({
					success: false,
					message: 'operation ('+operation+') failed with error ('+error.message+')'
				  });
				})
			}else{
				backupSettings = {"backupsettings" : {"enabled" : scheduledEnabled, "frequency" : frequency, "backuptype" : { "cds" : backuptypecds, "tftp" : backuptypesftp } , "maxbackup" : 3, "localDir" : "/tmp", "tftpserver" : { "type" : "sftp", "host" : "", "port" : "", "username" : "", "password" : "", "remotedir" : "" } }, date_updated: currentDate }
				if(backupSettings){
					UserModel.findOne({username: req.params.username}, function (err, userInfo) {
						if(err){
							logger.info(dbErrorMessage)
							logger.error(err)
							return res.json({
								success: false,
								message: dbErrorMessage
							});					
						}else if(userInfo){
							UserModel.findOneAndUpdate({ username: req.params.username }, backupSettings, async(err) => {
								if(err){
									logger.info(dbErrorMessage)
									logger.error(err)
									var description = "Error found during update backup settings :"+err
									auditLogData.description = description
									CommonService.createAuditLog(auditLogData)	
									return res.json({
										success: false,
										message: dbErrorMessage
									});
								}else{
									logger.info("Edit Backup Settings : Backup Settings updated successfully")
									var description = "Backup Settings updated successfully"
									auditLogData.description = description
									CommonService.createAuditLog(auditLogData)	
									return res.json({
										success: true,
										message: "Backup Settings updated successfully"
									});
								}
							});
						}else{
							logger.info("Edit Backup Settings : User not found when updating backup settings")
							return res.json({
								success: true,
								message: "User not found."
							 });
						}
					});	
				}
			}
		}
	} catch(e){
		logger.info("Edit Backup Settings : Exception occur when updating backup settings")
		logger.error(e)
		return res.json({
			success: false,
			message: "update backup settings Exception: "+e
		});
	}
});

//Download files from cds
router.get('/download/:historyId', function(req, res, next) {
	try{
		logger.info("Download files from cds API start from here");
		if((req.params.historyId == "" || req.params.historyId == undefined)){
			logger.info("Download Config Backup File : Backup file Id is missing in the request")
			res.json({
				success: false,
				message: 'Backup file Id is missing in the request.'
			});
		}else{
			
			BackupHistoryModel.findOne({_id: req.params.historyId}, async (err, fileInfo) => {
				if(err){
					logger.info(dbErrorMessage)
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(fileInfo && fileInfo.backupStatus != 'Ok'){
					logger.info("Download Config Backup File : Cannot download a backup file ["+fileInfo.filename+"] that was not finished successfully")
					return res.json({
						success: false,
						message: "Cannot download a backup that was not finished successfully."
					});
				}else if(fileInfo && fileInfo.backuptype && fileInfo.backuptype.cds){
					let filepathcds = path.join(fileInfo.cdsfileDir, fileInfo.filename)
					if (fs.existsSync(filepathcds)) {
						logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] from cds file system")
						let filedata = fs.readFileSync(filepathcds)
						let filebody = new Buffer(filedata).toString('base64');	
						const fileInfoCust = { filename : fileInfo.filename, data : filebody}
						return res.json({
							success: true,
							data: fileInfoCust
						})
					}else if(fileInfo && fileInfo.backuptype && fileInfo.backuptype.tftp){
						  logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] not found on cds server now trying from ftp server")
						  let backupSetting = await UserModel.findOne({username : 'admin'})
						  backupSetting = backupSetting.backupsettings
						  if(backupSetting && backupSetting.backuptype && backupSetting.backuptype.tftp){
							  const ftpConfig = {"type" : backupSetting.tftpserver.type, "host" : backupSetting.tftpserver.host, "port" : backupSetting.tftpserver.port, "username" : backupSetting.tftpserver.username, "password" : backupSetting.tftpserver.password}
							  const localfile = await ftpHelper.ftpDownload(fileInfo.remotefileDir, fileInfo.filename, ftpConfig)
							  if (fs.existsSync(localfile)) {
								let filedata = fs.readFileSync(localfile)
								let filebody = new Buffer(filedata).toString('base64');		
								const fileInfoCust = { filename : fileInfo.filename, data : filebody}
								fs.unlinkSync(localfile)
								logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] downloaded successfully")
								return res.json({
									success: true,
									data: fileInfoCust
								})
							  } else {
								logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] cannot be found on server")
								return res.json({
									success: false,
									message: "The backup file cannot be found on server."
								});
							  }
						  }else{
							return res.json({
								success: false,
								message: "The SFTP settings not found to download file."
							});  
						  }
					}else{
						logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] cannot be found on cds server")
						return res.json({
							success: false,
							message: "The backup file cannot be found on server."
						});
					}
				}else if(fileInfo && fileInfo.backuptype && fileInfo.backuptype.tftp){
					  let backupSetting = await UserModel.findOne({username : 'admin'})
					  backupSetting = backupSetting.backupsettings
					  if(backupSetting && backupSetting.backuptype && backupSetting.backuptype.tftp){
						  const ftpConfig = {"type" : backupSetting.tftpserver.type, "host" : backupSetting.tftpserver.host, "port" : backupSetting.tftpserver.port, "username" : backupSetting.tftpserver.username, "password" : backupSetting.tftpserver.password}
						  const localfile = await ftpHelper.ftpDownload(fileInfo.remotefileDir, fileInfo.filename, ftpConfig)
						  if (fs.existsSync(localfile)) {
							let filedata = fs.readFileSync(localfile)
							let filebody = new Buffer(filedata).toString('base64');		
							const fileInfoCust = { filename : fileInfo.filename, data : filebody}
							fs.unlinkSync(localfile)
							logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] downloaded successfully")
							return res.json({
								success: true,
								data: fileInfoCust
							})
						  } else {
							logger.info("Download Config Backup File : The backup file ["+fileInfo.filename+"] cannot be found on server")
							return res.json({
								success: false,
								message: "The backup file cannot be found on server."
							});
						  }
					  }else{
						return res.json({
							success: false,
							message: "The SFTP settings not found to download file."
						});  
					  }
				}else{
					logger.info("Download Config Backup File : The backup file ["+req.params.historyId+"] cannot be found in cds")
					return res.json({
						success: false,
						message: 'The backup file specified by the id (' + req.params.historyId + ') cannot be found'
					});
				}
			});	
		}
	} catch(e){
		logger.info("Download Config Backup File : Exception occur when downloading backup file Id ["+req.params.historyId+"]")
		logger.error(e)
		return res.json({
			success: false,
			message: "Download files from cds Exception: "+e
		});
	}
});


//check manual config backup file status
router.get('/checkbackupfilestatus/:fileId/:clusterIp', async(req, res, next) => {
	logger.info("Start check manual config backup file status API start from here")
	let fileId = req.params.fileId;
	let clusterIp = req.params.clusterIp;
	var selfthis = this;
	_getFileStatus(fileId)
	function _getFileStatus(fileId) {
		if(fileId.length != 24){
			logger.info("Check Config Backup File Status : The specified file id (" + fileId + ") is invalid")
			return res.json({
				success: false,
				message: 'The specified file id (' + fileId + ') is invalid'
			});
		}else{
			BackupHistoryModel.findOne({_id : fileId}, function (err, fileInfo) {
				if(err){
					logger.info(dbErrorMessage)
					logger.error(err)
					return res.json({
						success: false,
						message: dbErrorMessage
					});					
				}else if(fileInfo){
					if(fileInfo.backupStatus != 'Ok' && fileInfo.backupStatus != 'Error'){
						_getFileStatus(fileId)
					}else{
						if(fileInfo.backupStatus == 'Ok'){
							logger.info("Check Config Backup File Status : The config backup file for cluster ("+clusterIp+") is ready to download")
							return res.json({
								success: true,
								download: true,
								message: 'The config backup file for cluster ('+clusterIp+') is ready to download'
							});	
						}else{
							logger.info("Check Config Backup File Status : The manual config backup download operation for cluster ("+clusterIp+") failed with error : "+fileInfo.error)
							return res.json({
								success: true,
								download: false,
								message: 'The manual config backup download operation for cluster ('+clusterIp+') failed with error : '+fileInfo.error
							});	
						}
					}
				}else{
					logger.info("Check Config Backup File Status : The backup file specified by the id (" + fileId + ") cannot be found in cds")
					return res.json({
						success: false,
						message: 'The backup file specified by the id (' + fileId + ') cannot be found'
					});
				}
			})
		}
	}
});


//take manual config backup 
router.post('/configbackupdiff', async(req, res, next) => {
	logger.info("Start configuration backup diff API start from here")
	let controller = null
	let conn = null
	let task = {}
	var output = '{"recordsTotal":0,"recordsFiltered":0,"draw":0,"data":[]}';
	output = JSON.parse(output);
	try {
	 var controllerIp = req.query.ipaddress
	 var startdatetime = parseInt(req.query.startdatetime)
	 var enddatetime = parseInt(req.query.enddatetime)	  
	 controller = await ClusterModel.findOne({ip : controllerIp })
	  task.progress = {totalCount: 1, completedCount: 0, successCount: 0}
	  Connection.connections = {}
	  	if (!conn) {
		  // connection was not found due to MoM server restart, need to initialize the connection with all information
		  const connectIp = controller.ip ? controller.ip : controller.managementips
		  conn = new Connection(controller.id, connectIp, controller.loginid, controller.password)
		  // the available IPs
		  let availableIps = null
		  try {
			availableIps = controller.managementips
			conn.updateAvailableIps(availableIps)
		  } catch (err) {
			logger.info('failed to retrieve the list of management ip for controller (%s)', controller.name)
			logger.info(err)
		  }
		}
		//await conn.getValidateSessionAsync()
		conn.getValidateSession(async(success, request, response, error) => {
			if (success) {
				var configDiffData = []
				if (conn.is351orLater()) {
					var backup = new Backup35(conn, controller.name, {}, false, (success) => {
					  task.progress.completedCount ++
					  if (success) {
						task.progress.successCount ++
					  }
					  if (task.progress.completedCount === task.progress.totalCount) {
						logger.info('Backup task for controller name (%s) finished. %s out of %s wireless controller systems completed successfully', setting.id, task.progress.successCount, task.progress.completedCount)
					  } else {
						logger.info('Backup task for controller name (' + controller.name + ') finished ' + task.progress.completedCount + ' out of ' + task.progress.totalCount)
					  }
					})
					configDiffData = await backup._getAuditLog(startdatetime, enddatetime, 0, 0, [])
					output.recordsFiltered = configDiffData.length;
					output.recordsTotal = configDiffData.length;	
					output.draw = req.body.draw;
					if(Array.isArray(configDiffData)){  //Check Type Of Array
						output.data = configDiffData;
						return res.json(output)
					}else{
						let ResponseMsg = configDiffData
						if(configDiffData.response && configDiffData.response.data && configDiffData.response.data.message){
							ResponseMsg = configDiffData.response.data.message
						}
						return res.json({
							success: false,
							data : [],
							message: ResponseMsg
						})
					}	
				}else{
					var backup = new Backup34(conn, controller.name, {}, false, (success) => {
					  task.progress.completedCount ++
					  if (success) {
						task.progress.successCount ++
					  }
					  if (task.progress.completedCount === task.progress.totalCount) {
						logger.info('Backup task for controller name (%s) finished. %s out of %s wireless controller systems completed successfully', setting.id, task.progress.successCount, task.progress.completedCount)
					  } else {
						logger.info('Backup task for controller name (' + controller.name + ') finished ' + task.progress.completedCount + ' out of ' + task.progress.totalCount)
					  }
					})
					const properties = await backup.getAuditProperties()
					configDiffData = await backup._getAuditLog(startdatetime, enddatetime, 0, 0, 1000, [], properties)
					if(configDiffData){
						output.recordsFiltered = configDiffData.length;
						output.recordsTotal = configDiffData.length;	
						output.draw = req.body.draw;
						output.data = configDiffData;
						return res.json(output)
					}else{
						let ResponseMsg = configDiffData
						if(configDiffData.response && configDiffData.response.data && configDiffData.response.data.message){
							ResponseMsg = configDiffData.response.data.message
						}
						return res.json({
							success: false,
							data : [],
							message: ResponseMsg
						})
					}
					
				}
			}else{
				if(response && response.data){
					return res.json({
						success: false,
						message: response.data.message
					});
				}else{
					return res.json({
						success: false,
						message: "Cluster IP ["+controller.ip+"] not reachable"
					});
				}
			}
		})
    } catch(err) {
	  logger.error('Get configuration backup diff task failed to start')
	  console.log(err);
      return res.json({
			success: false,
			message: "Get configuration backup diff failed: "+err
		})
    }
});


// upload the backup file specified by the id to the controller
// and return the key for the backup record on the controller for later restore action
router.post('/uploadbackuptocontroller/:fileId', async(req, res, next) => {
  
  logger.info("Upload backup to controller API start from here");
  
  const fileId = req.params.fileId
  
  let backupSetting = await UserModel.findOne({username : 'admin'})
  backupSetting = backupSetting.backupsettings
  const ftpConfig = {"type" : backupSetting.tftpserver.type, "host" : backupSetting.tftpserver.host, "port" : backupSetting.tftpserver.port, "username" : backupSetting.tftpserver.username, "password" : backupSetting.tftpserver.password}
  BackupHistoryModel.findOne({_id: req.params.fileId}, async (err, backupData) => {
	let filepathcds = path.join(backupData.cdsfileDir, backupData.filename)
	if(err){
		logger.info(dbErrorMessage)
		logger.error(err)
		return res.json({
			success: false,
			message: dbErrorMessage
		});	
	}else if (!backupData) {
		logger.info("Upload backup file to controller : The backup specified by the id (" + fileId + ") cannot be found in cds")
		return res.json({
			success: false,
			message: 'The backup specified by the id (' + fileId + ') cannot be found.'
		});
	}else if (backupData.backupStatus !== 'Ok') {
		logger.info("Upload backup file to controller : Cannot restore a backup file ["+backupData.filename+"] that was not finished successfully")
		return res.json({
			success: false,
			message: "Cannot restore a backup that was not finished successfully."
		});
	}else if(backupData && backupData.backuptype.cds && !fs.existsSync(filepathcds)){
		logger.info("Upload backup file to controller : The backup file ["+backupData.filename+"] cannot be found on CDS server")
		return res.json({
			success: false,
			message: "The backup file cannot be found on CDS server."
		});
	}else if(backupData && backupData.backuptype && backupData.backuptype.tftp && !backupSetting) {
		logger.info("Upload backup file to controller : FTP setting for backup file ["+backupData.filename+"] with remote storage was not found. Cannot restore")
		return res.json({
			success: false,
			message: "FTP setting for backup with remote storage was not found. Cannot restore."
		});  
	}else{
	  backupData.ftp = ftpConfig
	  const connInfo = await ClusterModel.findOne({_id : backupData.clusterId })
	  if (!connInfo) {
		logger.info("Upload backup file to controller : The backup file ["+backupData.filename+"] was performed on a controller that is not found in the system")
		return res.json({
			success: false,
			message: "The backup was performed on a controller that is not found in the system"
		});
	  }
	  let conn = new Connection(connInfo.id, connInfo.ip, connInfo.loginid, connInfo.password)
	  try {
		conn.getValidateSession(async(success, request, response, error) => {
			if(success){
				const restoreTask = new Restore(conn, connInfo.name)
				let responseStatus = false
				setTimeout(()=> {
					if(!responseStatus){
						responseStatus = true
						return res.json({
							success: true,
							message: "Upload config process started successfully, It may takes about 5-20 minutes to upload, after that you can trigger the restore from smart zone"
						});	
					}					
				}, 45000);
				const restoreResponse = await restoreTask.uploadBackupToController(backupData)
				if(restoreResponse.success){
					const body = {
					  controllerId: backupData.clusterId,
					  backupKeyOnController: restoreResponse.key,
					  backupCreateDate: restoreResponse.createDate
					}
					logger.info("Upload backup file to controller : The backup file ["+backupData.filename+"] is uploaded to controller successfully")
					if(!responseStatus){
						responseStatus = true
						return res.json({
							success: true,
							data: body
						});	
					}
				}else{
					logger.info("Upload backup file to controller : Upload backup file ["+backupData.filename+"] failed with error")
					logger.error(restoreResponse)
					if(!responseStatus){
						responseStatus = true
						return res.json({
							success: false,
							message: restoreResponse
						});
					}
				}
				
			}else{
				logger.info("Upload backup file to controller : Upload backup file ["+backupData.filename+"] failed with error")
				logger.error(response)
				if(response && response.data){
					return res.json({
						success: false,
						message: response.data.message
					});
				}else{
					return res.json({
						success: false,
						message: "Cluster IP ["+connInfo.ip+"] not reachable"
					});
				}
			}
		})
	  } catch (err) {
		logger.info('Upload backup to controller encountered error')
		logger.info(err)
		return res.json({
			success: false,
			message: err.message
		});
	  }
	}
  })
});

// trigger the actual restore after backup file uploaded to controller
router.post('/triggerrestoreoncontroller', async(req, res, next) => {
  logger.info("Trigger restore on controller API start from here");
  const data = req.body
  if (!data) {
    return res.json({
		success: false,
		message: 'POST request body is missing'
	});
  }
  if (!data.controllerId) {
    return res.json({
		success: false,
		message: 'controllerId is required but missing from request body'
	});
  }

  if (!data.backupKeyOnController) {
    return res.json({
		success: false,
		message: 'backupKeyOnController is required but missing from request body'
	});
  }
  const connInfo = await ClusterModel.findOne({_id : data.controllerId })
  if (!connInfo) {
    return res.json({
		success: false,
		message: 'The controller specified by the controllerId (' + data.controllerId + ') cannot be found'
	});
  }
  let conn = new Connection(connInfo.id, connInfo.ip, connInfo.loginid, connInfo.password)
  try {
	conn.getValidateSession(async(success, request, response, error) => {
		if(success){
			const restoreTask = new Restore(conn, connInfo.name)
			let restoreResponse = await restoreTask.triggerRestoreOnController(data.backupKeyOnController)
			return res.json({
				message: restoreResponse
			});
		}else{
			if(response && response.data){
				return res.json({
					success: false,
					message: response.data.message
				});
			}else{
				return res.json({
					success: false,
					message: "Cluster IP ["+connInfo.ip+"] not reachable"
				});
			}
		}
	})
  } catch (err) {
    logger.info('Trigger restore on controller API encountered error')
    logger.info(err)
	return res.json({
		success: false,
		message: err.message
	});
  }
});

const dbOptions =  {
	user: 'ruckus',
	pass: 'ruckus',
	host: 'localhost',
	port: 27017,
	database: 'ruckus',
	autoBackupPath: '/var/database-backup/'  // Linux Machine
};

if(process.platform === "win32"){
	dbOptions.autoBackupPath = 'D:/database-backup/'
}

//check if dir exists, if not found create directory first
if(!fs.existsSync(dbOptions.autoBackupPath)){    
	mkdirp(dbOptions.autoBackupPath, function (err) {
		if (err) console.error(err)
		else console.log(dbOptions.autoBackupPath + ' does not exist. Create the directory first')
	});
}

/* return if variable is empty or not. */
exports.empty = function(mixedVar) {
    var undef, key, i, len;
    var emptyValues = [undef, null, false, 0, '', '0'];
    for (i = 0, len = emptyValues.length; i < len; i++) {
        if (mixedVar === emptyValues[i]) {
            return true;
        }
    }
    if (typeof mixedVar === 'object') {
        for (key in mixedVar) {
            return false;
        }
        return true;
    }
    return false;
};

// CDS DB Export API
router.get('/dbconfigexport', function(req, res, next) {
    logger.info("DB Config Export API start from here");
    var cmd = 'mongodump --host ' + dbOptions.host + ' --port ' + dbOptions.port + ' --db ' + dbOptions.database + ' --username ' + dbOptions.user + ' --password ' + dbOptions.pass + ' --archive='+dbOptions.autoBackupPath + ' --gzip '; // Command for mongodb dump process with compressed
	logger.info(cmd);
    exec(cmd, function (error, stdout, stderr) {
        if (exports.empty(error)) {
			if (!exports.empty(error)){
				logger.info('create DB Config record (%s) failed with error (%s)', err)
				logger.info(err)
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{
				return res.json({
					success: true,
					message: 'DB Dump has been successfully done'
				});
			}							   
        } else{
            logger.info(dbErrorMessage);
            logger.info(error);
            return res.json({
                success: false,
                message: dbErrorMessage
            });
        }
    });
});

// CDS DB Import API
var Storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, dbOptions.autoBackupPath);
    },
    filename: function (req, file, cb) {
        cb(null, dbOptions.database + '.gz');
    }
}); 

var upload = multer({ storage: Storage}).single('file');

router.post('/dbconfigimport', function(req, res, next) {
    logger.info("DB Config Import API start from here");
     upload(req, res, function(err){
        if(err){
            return res.json({
                success: false,
                message: err
            });
        }
        var cmd = 'mongorestore --host ' + dbOptions.host + ' --port ' + dbOptions.port + ' --db ' + dbOptions.database + ' --username ' + dbOptions.user + ' --password ' + dbOptions.pass + ' --gzip '+ '--archive=' + dbOptions.autoBackupPath + 'ruckus.gz'; // Command for mongodb restore process
        console.log(cmd);
        exec(cmd, {maxBuffer: 1024 * 100000}, function (error, stdout, stderr) {
            if (exports.empty(error)) {
                return res.json({
                    success: true,
                    message: 'DB Dump has been successfully restore'
                });
            } else{
                logger.info(dbErrorMessage);
                logger.info(error);
                return res.json({
                    success: false,
                    message: dbErrorMessage
                });
            }
        });
    });
});

// CDS DB Download API
router.get('/downloaddbconfig', function(req, res, next) {
	// var fileName = dbOptions.database + '.zip';
	var fileName = 'archive.gz';
    let filepathcds = path.join(dbOptions.autoBackupPath, fileName)
    if (fs.existsSync(filepathcds)) {
        let filedata = fs.readFileSync(filepathcds)
        let filebody = new Buffer(filedata).toString('base64');		
        const fileInfoCust = { filename : fileName, data : filebody}
        //fs.unlinkSync(file)
        logger.info("Download DB Config File : The backup file ["+fileName+"] downloaded successfully")
        return res.json({
            success: true,
            data: fileInfoCust
        })
    } else {
        return res.json({
            success: false,
            message: "The backup DB file cannot be found on server."
        });
    }
});

module.exports = router