var axios = require('axios')
const _ = require('lodash');
var Connection = require('./connection');
var Backup = require('./backup');
var logger = require("../config/logger.config");
var propertyHelper = require("../utils/property-helper");



class Backup34 extends Backup {

  async _startBackup(description) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config',
      operation: 'Start Backup'
    }
    return Connection.getAxios().post(request.url, {
    }, {
      headers: this._conn.getCommonHeaders()
    })
    .then((response) => {
      if (response.status === 200 && response.data.success) {
        this._onControllerCallSuccess(request)
        return this._createBackupRecord({
          description: description,
          backupStatus: 'Running',
          backupProgress: request.operation
        })
      } else {
        this._onControllerCallResponseError(request, response)
        return this._createBackupRecord({
          description: description,
          backupStatus: 'Error',
          backupProgress: request.operation,
          error: this._getResponseError(response)})
      }
    })
    .catch((error) => {
      this._onControllerCallError(request, error)
      return this._createBackupRecord({
        description: description,
        backupStatus: 'Error',
        backupProgress: request.operation,
        error: error.message})
    })
  }
  
  
   _checkBackupStatus() {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/backup/config/backupconfig/progress',
      operation: 'Check Backup Progress'
    }
    Connection.getAxios().get(request.url, {
      headers: this._conn.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data.success && response.data.data) {
        const backupStatus = response.data.data.backupStatus
        const progressState = response.data.data.progressState
        logger.info("Check Backup Progress for controller "+request.managementIp+" : "+ backupStatus);
		if (progressState !== 'BackupCompleted') {
          setTimeout(()=> {
            this._checkBackupStatus()
          }, 500)
        } else {
          logger.info('operation (%s) on controller (%s) finished with status (%s)', request.operation, request.managementIp, backupStatus)
          if (backupStatus === 'Successful') {
            this._retrieveBackupInfo()
          } else {
            this._updateBackupRecord({backupStatus: 'Error', backupProgress: 'Backup Failed'})
          }
        }
      } else {
        this._onControllerCallResponseError(request, response)
        this._updateBackupRecord({backupStatus: 'Error', backupProgress: 'Check backup progress'})
      }
    }).catch((error) => {
      this._onControllerCallError(request, error)
      this._updateBackupRecord({backupStatus: 'Error', backupProgress: 'Check backup progress'})
    })
  }



async getAuditProperties() {
    if (this._auditProperties) {
      // if the properties has been cached, return the cached value
      return this._auditProperties
    }
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/session/i18n/en_US',
      operation: 'Get Audit Properties'
    }
    let response
    try {
      response = await Connection.getAxios().get(request.url, {
        headers: this._conn.getCommonHeaders()
      })
      if (response.status === 200 && response.data && response.data.success) {
        logger.info('operation (%s) on controller (%s) finished successfully', request.operation, request.managementIp)
        const auditProperties = {}
        _.forEach(response.data.data, (value, key) => {
          if (_.startsWith(key, 'audit.')) {
            auditProperties[key] = value
          }
        })
        // cache only audit properties
        this._auditProperties = auditProperties
        return this._auditProperties
      } else {
        logger.info('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
              request.operation, request.managementIp, response.status, Connection.stringifyResponseData(response.data))
        logger.info(response.data)
        throw new Error('audit properties file cannot be loaded.')
      }
    } catch (err) {
      if (err.response) {
        logger.info('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
              request.operation, request.managementIp, err.response.status, Connection.stringifyResponseData(err.response.data))
        logger.info(err.response.data)
      } else {
        logger.info('operation (%s) on controller (%s) failed with error (%s)',
              request.operation, request.managementIp, err.message)
        logger.info(err)
      }
      throw new Error('audit properties file cannot be loaded.')
    }
  }



  async _getAuditLog(starttime, endtime, page, start, limit, results, properties) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/scg/auditMsgs',
      operation: 'Retrieve Audit Log'}

    let response
    try {
      response = await Connection.getAxios().get(request.url, {
        params: {
          limit: limit,
          page: page,
          start: start,
          criteria: JSON.stringify([{
            columnName: 'auditTime',
            operator: 'gte',
            value: starttime
          }, {
            columnName: 'auditTime',
            operator: 'lt',
            value: endtime
          }])
        },
        headers: this._conn.getCommonHeaders()
      })
    } catch(err) {
      this._onControllerCallError(request, err)
      //throw new Error(this._conn._onControllerCallError(request, err))
      return err
    }
    if (response.status === 200 && response.data && response.data.success) {
      // paging test
      _.reduce(response.data.data.list, (o, v, k) => {
        if (v.action !== 'LOGIN' && v.action !== 'LOGOUT') { // excluse the login/logout messages
          const audit = {}
          audit.action = propertyHelper.formatMessage(v.actionMsgKey, null, properties)
          audit.object = propertyHelper.formatMessage(v.objectMsgKey, null, properties)
          audit.message = propertyHelper.formatMessage(v.msgMsgKey, v.msgValues ? JSON.parse(v.msgValues) : null, properties)
          audit.auditTime = v.auditTime
          audit.createUserName = v.createUserName
          audit.ipAddress = v.ipAddress

          o.push(audit)
        }
        return o
      }, results)
      if (response.data.data.totalCount > (page * limit)) {
        await this._getAuditLog(starttime, endtime, page+1, start+limit, limit, results, properties)
      }
      return results
    } else {
      this._onControllerCallResponseError(request, response)
      //throw new Error(this._onControllerCallResponseError(request, response))
      return response.data.error
    }
  }
  
}

module.exports = Backup34
