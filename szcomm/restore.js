var axios = require('axios');
var fs = require('fs');
var path = require('path');
var util = require('util');
var ftpHelper = require('../utils/ftp-helper');
var Connection = require('./connection');
let logger = require("../config/logger.config");
const _ = require('lodash');
var followRedirects = require('follow-redirects');
followRedirects.maxBodyLength = 5 * 1024 * 1024 * 1024; // 5 GB

class Restore {
  constructor(conn, clusterName, onComplete) {
    this._conn = conn
    this._clusterName = clusterName
    this._onComplete = onComplete // the callback function
  }

  _onCompleteCallback(error) {
    if (this._onComplete) {
      this._onComplete(error)
    }
  }

  _getErrorMessage(request, response, error, message) {
    let notifyMsg
    if (response) {
      notifyMsg = util.format('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
         request.operation, request.managementIp, response.status, Connection.stringifyResponseData(response.data))
      logger.info(notifyMsg)
    } else if (error) {
      if (error.response) {
        notifyMsg = util.format('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
              request.operation, request.managementIp, error.response.status, Connection.stringifyResponseData(error.response.data))
        logger.info(notifyMsg)
      } else {
        notifyMsg = util.format('operation (%s) on controller (%s) failed with error (%s)',
                                request.operation, request.managementIp, error.message)
        logger.info(notifyMsg)
        logger.info(error)
      }
    } else {
      notifyMsg = util.format('operation (%s) on controller (%s) failed with error (%s)',
                              request.operation, request.managementIp, message)
      logger.info(notifyMsg)
    }
    return notifyMsg
  }

  _notifyError(request, response, error, message) {
    let notifyMsg = this._getErrorMessage(request, response, error, message)
    if (error) {
      // for server timeout/cannot connect
      notifyMsg += '. Most likely the connected controller is being restarted as part of the restore process. You should close the window now.'
    }
    //const data = {action: 'SZ_RESTORE_SOCKET',  payload: {done: true, status: 'error', message: notifyMsg}}
    //global.io.broadcast('BACKUP', data)
    this._onCompleteCallback({message: notifyMsg})
  }

  _notifyProgress(done, request, message) {
    let notifyMsg
    if (message) {
      notifyMsg = message
      logger.info(message)
    } else {
      notifyMsg = util.format('operation (%s) on controller (%s) finished successfully', request.operation, request.managementIp)
      logger.info(notifyMsg)
    }
    //const data = {action: 'SZ_RESTORE_SOCKET',  payload: {done: done, status: done ? 'success': 'info', message: notifyMsg}}
    //global.io.broadcast('BACKUP', data)
    if (done) {
      this._onCompleteCallback()
    }
  }


  async uploadBackupToController(backup) {
    //await this._conn.getValidateSessionAsync()
    var thisSelf = this
	let localfile, deleteAfter, fileContent
    deleteAfter = true
	let request = {
      managementIp: thisSelf._conn.getBaseUrlMgmtIp(),
      operation: 'Upload Backup File'
    }
	if (!backup.backuptype.cds) {
      logger.info('Uploading file on vSZ from ftp server')
	  localfile = await ftpHelper.ftpDownload(backup.remotefileDir, backup.filename, backup.ftp)
	  return await thisSelf._uploadBackupSync(localfile, backup.filename, deleteAfter)
    } else {
	  logger.info('Uploading file on vSZ from cds file system')
	  localfile = path.join(backup.cdsfileDir, backup.filename)
	  return await thisSelf._uploadBackupSync(localfile, backup.filename, false)
	  /* return new Promise(function(resolve, reject) {
		  fs.writeFile(localfile, fileContent, async(err) => {
			  if (err){
				let errorRes = thisSelf._getErrorMessage(request, null, null, err)
				resolve(errorRes)
			  }else{
				let res = await thisSelf._uploadBackupSync(localfile, backup.filename, deleteAfter)
				resolve(res)
			  }
		  });
	  }); */
    }
  }

  async _uploadBackupSync(localFile, filename, deleteAfter) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config/upload',
      operation: 'Upload Backup File'
    }
    const FormData = require('form-data')
    const data = new FormData()
    data.append('filename', filename)
    data.append('backupFile', fs.createReadStream(localFile))
    const headers = data.getHeaders()
    headers.Cookie = this._conn.getCookie()
	
    let response
    try {
      response = await axios({method: 'post', url: request.url, data: data, timeout: 1800000, headers : headers});	  
	  /* response = await Connection.getAxios().post(request.url, data, {
        headers: headers
      }) */
    } catch(err) {
      if (deleteAfter) {
        // delete the local file regardless of upload successful or not
        fs.unlinkSync(localFile)
      }
	  return this._getErrorMessage(request, null, err)
    }

    if (deleteAfter) {
      // delete the local file regardless of upload successful or not
      fs.unlinkSync(localFile)
    }

    if (response.status === 200 && response.data && response.data.success) {
      logger.info('operation (%s) on controller (%s) finished successfully', request.operation, request.managementIp)
	  return await this._retrieveBackupInfoSync()
    } else {
      return this._getErrorMessage(request, response)
    }
  }

  async _retrieveBackupInfoSync() {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config',
      operation: 'Retrieve Uploaded Backup Record'}

    let response
    try {
      response = await Connection.getAxios().get(request.url, {
        params: {
            limit: 1,
            page: 1,
            start: 0
        },
        headers: this._conn.getCommonHeaders()
      })
    } catch(err) {
      return this._getErrorMessage(request, null, err)
    }
    if (response.status === 200 && response.data.success && response.data.data && response.data.data.list && response.data.data.list.length === 1) {
      logger.info('operation (%s) on controller (%s) finished successfully', request.operation, request.managementIp)
	  const result = response.data.data.list[0]
      return {success : true, key : result.key, createDate : result.createDate}
    } else {
      return this._getErrorMessage(request, response)
    }
  }

  async triggerRestoreOnController(backupKey) {
    await this._conn.getValidateSessionAsync()
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config',
      operation: 'Start Restore'
    }
    let response
    try {
      response = await Connection.getAxios().post(request.url + '/' + backupKey + '/restore', {}, {
        headers: this._conn.getCommonHeaders()
      })
    } catch(error) {
      return this._getErrorMessage(request, null, error)
    }
    if (response.status === 200 && response.data && response.data.success) {
      logger.info('operation (%s) on controller (%s) finished successfully', request.operation, request.managementIp)
      this._checkRestoreProgress(0)
    } else {
      return this._getErrorMessage(request, response)
    }
  }
  
  _checkRestoreProgress(counter) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config/restoreconfig/progress',
      operation: 'Check Restore Progress'
    }
    Connection.getAxios().get(request.url, {
      //timeout: 2000,
      headers: this._conn.getCommonHeaders()
    }).then((response) => {
      console.log(response)
	  if (response.status === 200 && response.data.success && response.data.data) {
        const backupStatus = response.data.data.backupStatus
        const progressState = response.data.data.progressState
        const stateMessage = response.data.data.stateMessage
        let resetCounter = false
        if (backupStatus !== 'Successful' && backupStatus !== 'Error') {
          console.log("coming1")
		  if (counter >= 5) {
            console.log("coming11")
			// reduce the logging and socket notify
            this._notifyProgress(false, request, 'Restoring database is in progress: ' + stateMessage + '. It may take around 5 minutes to finish restoring data and another 10-20 minutes to restart all services.')
            counter = 0
          } else {
            console.log("coming12")
			counter ++
          }
          setTimeout(()=> {
            this._checkRestoreProgress(counter)
          }, 1000)
        } else if (backupStatus === 'Successful') {
			console.log("coming2")
          this._notifyProgress(true, request, 'Restoring database finished successfully. Controller will restart services on all nodes and connection to the controller will be dropped for few minutes. You can close this window now.')
        } else {
          console.log("coming3")
		  this._notifyError(request, null, null, 'Restroing database failed with error (' + stateMessage+ ')')
        }
      } else {
        console.log("coming4")
		this._notifyError(request, response)
      }
    }).catch((error) => {
      console.log("coming5")
	  // error.code ECONNABORTED, ECONNRESET, ECONNREFUSED means that SCG web service has been shutdown
      this._notifyError(request, null, error)
    })
  }
}

module.exports = Restore 
