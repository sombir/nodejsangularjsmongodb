const _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Connection = require('./connection');
var logger = require("../config/logger.config");
var ClusterModel = require('../models/ClusterModel');
var BackupHistoryModel = require('../models/BackupHistoryModel');
var ftpHelper = require('../utils/ftp-helper');

class Backup {
  constructor(conn, clusterName, backupSetting, isManual, onComplete) {
    this._conn = conn
    this._clusterName = clusterName
    this._backupSetting = backupSetting
    this._isManual = isManual
    this._onComplete = onComplete // the callback function
    this._auditProperties = null
  }
  
  async _checkMaxBackupEntry(clusterId){
	  var selfthis = this
	  const operation = 'Remove Old Backup File from CDS'
	  let backupCount = await BackupHistoryModel.count({ clusterId: clusterId })
	  if(backupCount >= 3 ){
		  logger.info('Max backup limit (3) reached for custer (%s) time to delete most older backup file',this._clusterName)
		  BackupHistoryModel.find({ clusterId: clusterId }, {file: false}).sort({backupTimestamp: 1}).limit(1).exec(function(err, mostOldBackupEntry) {
			let maxRecordId = mostOldBackupEntry[0].id
			let filename = mostOldBackupEntry[0].filename
			let cdsFilePath = mostOldBackupEntry[0].cdsfileDir
			let remoteDir = mostOldBackupEntry[0].remotefileDir
			if(maxRecordId){
				BackupHistoryModel.remove({_id: maxRecordId}, function (err) {
					if(err){ 
						logger.info("Error found when deleting old backup entry Id (%s)",maxRecordId);
					}else{
						logger.info('operation (%s) finished successfully', operation)
						let filepathcds = path.join(cdsFilePath, filename)
						fs.unlinkSync(filepathcds) // delete the local file
					}
				});	
			}
		  });
	  }
  }
  
  _createBackupRecord(backupRecord, callback) {
     var selfthis = this
	return new Promise(function(resolve,reject){
		try {
		  backupRecord.clusterId = selfthis._conn.getControllerId()
		  backupRecord.backuptype =  {"cds" : selfthis._backupSetting.storageType.cds, "tftp" : selfthis._backupSetting.storageType.tftp} 
		  backupRecord.cdsfileDir =  backupRecord.backuptype.cds ? path.join(selfthis._backupSetting.localDir, selfthis._normalizedClusterName()) : ''
		  backupRecord.remotefileDir = backupRecord.backuptype.tftp ? path.join(selfthis._backupSetting.remoteDir, selfthis._normalizedClusterName()) : ''
		  backupRecord.error = backupRecord.error ? backupRecord.error : null
		  selfthis._checkMaxBackupEntry(backupRecord.clusterId);
		  var createBackup = new BackupHistoryModel(backupRecord);
		  createBackup.save(function (err) {
			if (err){
				logger.info('create backup record on cluster (%s) failed with error (%s)', selfthis._clusterName, err.message)
				logger.info(err)
				reject()
			}else{
				selfthis._backupRecordId = createBackup._id
				resolve(createBackup)
			}							   
		  })
		} catch (err) {
		  logger.info('create backup record on cluster (%s) failed with error (%s)', selfthis._clusterName, err.message)
		  logger.info(err)
		  reject()
		}
	})
  }

  _updateBackupRecord(backupRecord) {
    var selfthis = this
	BackupHistoryModel.findOneAndUpdate({ _id: selfthis._backupRecordId }, backupRecord, function(err, updatedAP) {
		if(err){
			logger.info('update backup record on cluster (' + selfthis._clusterName + ') failed')
			logger.info(err)
			if (backupRecord.backupStatus === 'Error' || backupRecord.backupStatus === 'Ok') {
				selfthis._onCompleteCallback(backupRecord)
			}
		}else{
			if (backupRecord.backupStatus === 'Error' || backupRecord.backupStatus === 'Ok') {
				selfthis._onCompleteCallback(backupRecord)
			}
		}		
	})
  }
  
  _retrieveBackupInfo() {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config',
      operation: 'Retrieve Backup File Info'
    }

    Connection.getAxios().get(request.url, {
      params: {
          limit: 1,
          page: 1,
          start: 0
      },
      headers: this._conn.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data.success && response.data.data
          && response.data.data.list && response.data.data.list.length === 1) {
        this._onControllerCallSuccess(request)
        const backupFile = response.data.data.list[0]
        this._updateBackupRecord({ filename: backupFile.filename, filesize: backupFile.filesize, version: backupFile.version})
        // save the backup file
        this._downloadBackupFile(backupFile.key, backupFile.filename)
      } else {
        this._onControllerCallResponseError(request, response)
        this._updateBackupRecord({backupStatus: 'Error', backupProgress: request.operation})
      }
    }).catch((error) => {
      this._onControllerCallError(request, error)
      this._updateBackupRecord({backupStatus: 'Error', backupProgress: request.operation})
    })
  }

  _downloadBackupFile(key, filename) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config/download',
      operation: 'Download Backup File'
    }
    const headers = {
      Cookie: this._conn.getCookie()
    }
    headers['Accept-Encoding'] = 'gzip, deflate, sdch, br'
    headers['Content-Type'] = 'application/octet-stream'
    Connection.getAxios().get(request.url, {
      params: {
        backupUUID: key,
        timezone: new Date().getTimezoneOffset()
      },
      headers: headers,
      responseType: 'stream'
    }).then((response) => {
      if (response.status === 200 && response.data) {
        this._onControllerCallSuccess(request)
        try {
          let filepathcds
          let filepathremote
          if (this._backupSetting.storageType.cds == true) {
            filepathcds = path.join(this._backupSetting.localDir, this._normalizedClusterName())
            this._mkdirSync(filepathcds)
            filepathcds = path.join(filepathcds, filename)
			const wstreamcds = fs.createWriteStream(filepathcds)
			  response.data.pipe(wstreamcds)
			  wstreamcds.on('finish', () => {
				/*
				let backupRecord = {}
				backupRecord.file = {}
				backupRecord.file.data = fs.readFileSync(filepathcds);
				backupRecord.file.contentType = 'bak';
				backupRecord.backupStatus = 'Ok'
				this._updateBackupRecord(backupRecord)
				*/
				//fs.unlinkSync(filepathcds) // delete the local file, file saved in db
				this._updateBackupRecord({backupStatus: 'Ok'})
				if (this._backupSetting.storageType.tftp != true) {
				  logger.info('operation (%s) finished successfully', 'Save Backup File CDS')
				  this._deleteBackupFileOnSz(key, request.operation)
				}
			  })
			  wstreamcds.on('error', (err) => {
				logger.info('operation (%s) failed with error (%s)', 'Save Backup File', err.message)
				logger.info(err)
				this._updateBackupRecord({backupStatus: 'Error', backupProgress: 'Save Backup File', error: err.message})
			  })
		  }
		  
		  if (this._backupSetting.storageType.tftp == true) {
            filepathremote = path.join('/tmp', filename)
			const wstreamremote = fs.createWriteStream(filepathremote)
			  response.data.pipe(wstreamremote)
			  wstreamremote.on('finish', () => {
				logger.info('operation (%s) finished successfully', 'Save Backup File FTP')
				this._ftpBackupFile(filepathremote, filename, key)
			  })
			  wstreamremote.on('error', (err) => {
				logger.info('operation (%s) failed with error (%s)', 'Save Backup File', err.message)
				logger.info(err)
				this._updateBackupRecord({backupProgress: 'Save Backup File', error: err.message})
			  })
		  }
		  
        } catch (err) {
          logger.info('operation (%s) failed with error (%s)', 'Save Backup File', err.message)
          logger.info(err)
          this._updateBackupRecord({backupStatus: 'Error', backupProgress: 'Save Backup File', error: err.message})
        }
      } else {
        this._onControllerCallResponseError(request, response)
        this._updateBackupRecord({backupStatus: 'Error', backupProgress: request.operation, error: this._getResponseError(response)})
      }
    }).catch((error) => {
      this._onControllerCallError(request, error)
      this._updateBackupRecord({backupStatus: 'Error', backupProgress: request.operation, error: error.message})
    })
  }

  // create the directory if not exist (recursively), do nothing otherwise
  _mkdirSync(dirpath) {
    const parts = dirpath.split(path.sep)
    const isAbsolute = path.isAbsolute(dirpath)
    let root
    if (isAbsolute) {
      root = path.parse(dirpath).root
    }
    for( var i = 1; i <= parts.length; i++ ) {
      let dir = path.join.apply(null, parts.slice(0, i))
      if (isAbsolute) {
        dir = root + dir
      }
      try {
        fs.accessSync(dir, fs.constants.F_OK)
      } catch (err) {
        logger.info(dir + ' does not exist. Create the directory first')
        fs.mkdirSync(dir)
      }
    }
  }

  _ftpBackupFile(file, filename, backupKey) {
    const operation = 'FTP Backup File'
    const ftpRemoteDir = this._backupSetting.remoteDir
    const clusterName = this._normalizedClusterName()
    const remoteDir = path.join(ftpRemoteDir, clusterName)
	const ftpconfig = {"type" : this._backupSetting.tftp.type, "host" : this._backupSetting.tftp.host, "port" : this._backupSetting.tftp.port, "username" : this._backupSetting.tftp.username, "password" : this._backupSetting.tftp.password}
    ftpHelper.ftpUpload(file, remoteDir, filename, ftpconfig)
    .then((remotefile) => {
      logger.info('operation (%s) finished successfully. (%s) has transfered to FTP site, remote file is (%s)', operation, file, remotefile)
      fs.unlinkSync(file) // delete the tmp file
      this._deleteBackupFileOnSz(backupKey, operation)
    }).catch ((error) => {
      logger.info('operation (%s) failed with error (%s)', operation, error.message)
      logger.info(error)
      this._updateBackupRecord({backupProgress: 'FTP backup file', error: 'FTP Error : '+error.message})
	  this._deleteBackupFileOnSz(backupKey, operation)
    })
  }

  _deleteBackupFileOnSz(key, lastOperation) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config',
      operation: 'Delete Backup on Controller'
    }
    Connection.getAxios().delete(request.url + '/' + key, {
      headers: this._conn.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        this._onControllerCallSuccess(request)
        this._updateBackupRecord({backupStatus: 'Ok', backupProgress: 'Backup record deleted on controller'})
      } else {
        this._onControllerCallResponseError(request, response)
        this._updateBackupRecord({backupStatus: 'Ok', backupProgress: lastOperation})
      }
    }).catch((error) => {
      this._onControllerCallError(request, error)
      this._updateBackupRecord({backupStatus: 'Ok', backupProgress: lastOperation})
    })
  }
  
   _normalizedClusterName() {
    let name = this._clusterName.replace(' ', '_') // replace space with underscore
    name = name.replace('/', '_')
    name = name.replace('>', '_')
    name = name.replace('<', '_')
    name = name.replace('|', '_')
    name = name.replace(':', '_')
    name = name.replace('&', '_')
    return name
  }

  _getResponseError(response) {
    if (response.status === 200) {
      const data = response.data
      if (_.isString(data)) {
        return data
      } else if (data.error) { // SCG internal error
        return data.error.message
      } else if (_.isObject(data)) {
        return JSON.stringify(data)
      }
    } else {
      return 'API call response code ' + response.status
    }
  }
  
  _onCompleteCallback(backupRecord) {
    if (this._onComplete) {
      this._onComplete(backupRecord.backupStatus === 'Ok')
    }
    if (this._isManual) {
      logger.info('Manual backup task for controller (%s) finished. notify client to refresh data.', this._conn.getBaseUrlMgmtIp())
     /*  global.io.broadcast('BACKUP', {
        action: 'BACKUP_DONE_SOCKET',
        payload: {
          status: backupRecord.backupStatus === 'Ok' ? 'success' : 'error',
          message: 'Manual backup task finished',
        }
      }) */
    } else if (backupRecord.backupStatus !== 'Ok') {
      // send alarm
    }
  }

  _onControllerCallSuccess(request) {
    logger.info('operation (%s) on controller (%s) finished successfully', request.operation, request.managementIp)
  }

  _onControllerCallResponseError(request, response) {
    logger.info('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
         request.operation, request.managementIp, response.status, Connection.stringifyResponseData(response.data))
    logger.info(response.data)
  }

  _onControllerCallError(request, error) {
    if (error.response) {
      logger.info('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
            request.operation, request.managementIp, error.response.status, Connection.stringifyResponseData(error.response.data))
      logger.info(error.response.data)
    } else {
      logger.info('operation (%s) on controller (%s) failed with error (%s)',
            request.operation, request.managementIp, error.message)
      logger.info(error)
    }
  }

}

module.exports = Backup
