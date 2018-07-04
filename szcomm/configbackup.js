const _ = require('lodash');
const cron = require('node-cron');
var Connection = require('./connection');
var Backup34 = require('./backup34');
var Backup35 = require('./backup35');
var logger = require("../config/logger.config");
var ClusterModel = require('../models/ClusterModel');
var UserModel = require('../models/UserModel');

var tasks = {}
var globalSetting = {}

// setup the scheduled configuration backup task, called at the server startup time
exports.startAll = async() => {
   logger.info('initialize scheduled backup tasks')
    // initialize task data
	let settings = null
	var view = this;
    Connection.connections = {}
	const settingInfo = await UserModel.findOne({username : 'admin'})
	const setting = {"id" : settingInfo._id, "scheduleEnabled" : settingInfo.backupsettings.enabled, "scheduleCron" : settingInfo.backupsettings.frequency, "storageType" : {"cds": settingInfo.backupsettings.backuptype.cds, "tftp" : settingInfo.backupsettings.backuptype.tftp}, "localDir" : settingInfo.backupsettings.localDir, "remoteDir" : settingInfo.backupsettings.tftpserver.remotedir, "maxBackupPerController" : settingInfo.backupsettings.maxbackup, "tftp" : settingInfo.backupsettings.tftpserver }
	globalSetting = setting
	view.checkConfigBackCronStatus()  
	const scheduleCron = setting.scheduleCron
	const scheduleEnabled = setting.scheduleEnabled
	if (!scheduleCron) {
	  logger.info('Backup setting (id=%s) missing schedule cron string, cannot start the task', setting.id)
	  return
	}
	if (!scheduleEnabled) {
	  logger.info('Backup setting (id=%s) schedule cron is disabled, cannot start the task', setting.id)
	  return
	}
	logger.info('Backup task scheduled as ' + scheduleCron + ' for setting id (' + setting.id + ')')
	const task = {}
	task.setting = setting
	task.progress = {}
	task.cronTask = cron.schedule(scheduleCron, async () => {
	  await view.cronTaskCallback(setting, task)
	})
	task.cronTask.start()
	tasks[setting.id] = task
      
}

// setup the scheduled configuration backup task, called at the server startup time
exports.checkConfigBackCronStatus = async() => {
	var view = this;
	cron.schedule('*/5 * * * *', async() => {
	  const settingInfo = await UserModel.findOne({username : 'admin'})
	  const setting = {"id" : settingInfo._id, "scheduleEnabled" : settingInfo.backupsettings.enabled, "scheduleCron" : settingInfo.backupsettings.frequency, "storageType" : {"cds": settingInfo.backupsettings.backuptype.cds, "tftp" : settingInfo.backupsettings.backuptype.tftp}, "localDir" : settingInfo.backupsettings.localDir, "remoteDir" : settingInfo.backupsettings.tftpserver.remotedir, "maxBackupPerController" : settingInfo.backupsettings.maxbackup, "tftp" : settingInfo.backupsettings.tftpserver }
	  if((globalSetting.scheduleCron != setting.scheduleCron) || (globalSetting.scheduleEnabled != setting.scheduleEnabled)){
		logger.info('checking backup schedule setting if there is any changes, changes found, resetting schedule');  
		globalSetting = setting
		view.start(_.cloneDeep(setting))  
	  }else{
		logger.info('checking backup schedule setting if there is any changes, no changes found');  
	  }
	});
}

exports.start = async(setting) => {
    var view = this;
	let task = tasks[setting.id]
    if (task) {
      if (task.cronTask) {
        task.cronTask.destroy()
      }
    } else {
      task = {}
      tasks[setting.id] = task
    }
	if (!setting.scheduleEnabled) {
      logger.info('Backup setting (id=%s) schedule cron is disabled, cannot start the task', setting.id)
      return
    }
    task.setting = setting
    task.progress = {}
    task.cronTask = cron.schedule(setting.scheduleCron, async () => {
      await view.cronTaskCallback(setting, task)
    })
    task.cronTask.start()
    logger.info('Backup task scheduled as ' + setting.scheduleCron + ' for setting id (' + setting.id + ')')
}

exports.destroy = function(settingId){
	let task = tasks[settingId]
    if (task && task.cronTask) {
      task.cronTask.destroy()
    }
    delete tasks[settingId]
}

// the callback function for the schedule task
exports.cronTaskCallback = async(setting, task) => {
    try {
      var view = this;
	  logger.info('Backup task for setting id (' + setting.id + ') running')
      const szs = await ClusterModel.find({status : 1});
	  if (szs.length === 0) {
        logger.info('Backup task for setting id (' + setting.id + ') finished. There is no controller associated with this task.')
      }
      task.progress = {totalCount: szs.length, completedCount: 0, successCount: 0}
	  Connection.connections = {}

      _.forEach(szs, async (sz, key) => {
        // in some cases, the clusterName was not discovered yet, we will skip the backup before the target directory is determined by the cluster name
        if (!sz.name) {
          logger.info('Backup task for setting id (' + setting.id + ') aborted for cluster (' + sz.id +  ') because clusterName is unknown yet')
          return
        }
        const controllerId = sz.id
        // get the connection
        let  conn = Connection.findConnection(controllerId)
        if (!conn) {
          conn = new Connection(sz.id, sz.ip, sz.loginid, sz.password)
          Connection.register(conn, false)
        }
        await conn.getValidateSessionAsync()
		if (conn.is351orLater()) {
			var backup = new Backup35(conn, sz.name, setting, false, (success) => {
			  task.progress.completedCount ++
			  if (success) {
				task.progress.successCount ++
			  }
			  if (task.progress.completedCount === task.progress.totalCount) {
				logger.info('Backup task for setting id (%s) finished. %s out of %s wireless controller systems completed successfully', setting.id, task.progress.successCount, task.progress.completedCount)
			  } else {
				logger.info('Backup task for setting id (' + setting.id + ') finished ' + task.progress.completedCount + ' out of ' + task.progress.totalCount)
			  }
			})
	    }else{
			var backup = new Backup34(conn, sz.name, setting, false, (success) => {
			  task.progress.completedCount ++
			  if (success) {
				task.progress.successCount ++
			  }
			  if (task.progress.completedCount === task.progress.totalCount) {
				logger.info('Backup task for setting id (%s) finished. %s out of %s wireless controller systems completed successfully', setting.id, task.progress.successCount, task.progress.completedCount)
			  } else {
				logger.info('Backup task for setting id (' + setting.id + ') finished ' + task.progress.completedCount + ' out of ' + task.progress.totalCount)
			  }
			})
	    }
        logger.info('Backup task for setting id (' + setting.id + ') start for cluster (' + sz.name +  ')')
        var backupRecord = await backup._startBackup('scheduled backup')
		if(backupRecord){
			if(backupRecord.backupStatus != 'Error'){
				await backup._checkBackupStatus()
			}
		}
      })
    } catch (err) {
      logger.info('Backup task for setting id (' + setting.id + ') stopped with error')
      logger.info(err)
    }
}


// the callback function for the schedule task
exports.manualconfigbackup = async(ipAddress, setting, description, callback) => {
    try {      
	  Connection.connections = {}
	  logger.info('Manual Backup task for setting id (' + setting.id + ') running')
      const sz = await ClusterModel.findOne({ip : ipAddress});
	    const controllerId = sz.id
        // get the connection
        let  conn = Connection.findConnection(controllerId)
        if (!conn) {
          conn = new Connection(sz.id, sz.ip, sz.loginid, sz.password)
          Connection.register(conn, false)
        }
        conn.getValidateSession(async(success, request, response, error) => {
			if(success){
				try {
					if (conn.is351orLater()) {
						var backup = new Backup35(conn, sz.name, setting, true, null)
						
					}else{
						var backup = new Backup34(conn, sz.name, setting, true, null)
					}
					var backupRecord = await backup._startBackup(description)
					if(backupRecord){
						if(backupRecord._id){
							callback(false,'',backupRecord._id);
						}
						if(backupRecord.backupStatus != 'Error'){
							await backup._checkBackupStatus()
						}
					}else{
						callback(true,'','');
					}
				} catch (err) {
					logger.info(err)
					callback(true,err,'');
				}
			}else{
				if(response && response.data){
					callback(true,response.data.message,'');
				}else{
					callback(true,'Cluster IP ['+sz.ip+'] is not reachable from CDS','');
				}
			}
		});
		
		
		
    } catch (err) {
      logger.info('Backup task for setting id (' + setting.id + ') stopped with error')
      logger.info(err)
	  callback(true,err,'');
    }
}