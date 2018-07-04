var axios = require('axios');
const _ = require('lodash');
var Connection = require('./connection');
var Backup = require('./backup');
var logger = require("../config/logger.config");

class Backup35 extends Backup {
	
  async _startBackup(description) {
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      url:  this._conn.getBaseUrl() + '/public/v5_1/configuration/backup',
      operation: 'Start Backup'
    }
    return Connection.getAxios().post(request.url, {
    }, {
      headers: this._conn.getCommonHeaders()
    })
    .then((response) => {
      if (response.status === 201) {
        logger.info('backup record id = ' + response.data.id)
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
      url:  this._conn.getBaseUrl() + '/public/v5_1/configuration/backupconfig/progress',
      operation: 'Check Backup Progress'
    }
    Connection.getAxios().get(request.url, {
      headers: this._conn.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200) {
        const backupStatus = response.data.status
        const progressMessage = response.data.message
         logger.info("Check Backup Progress for controller "+request.managementIp+" : "+ backupStatus);
		if (backupStatus === 'ConfigurationBackupPerforming' || backupStatus === 'ConfigurationBackupPreparing') {
          setTimeout(()=> {
            this._checkBackupStatus()
          }, 500)
        } else {
          logger.info('operation (%s) on controller (%s) finished with status (%s) and message (%s)', request.operation, request.managementIp, backupStatus, progressMessage)
          if (backupStatus === 'ConfigurationBackupCompleted') {
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

  async _getAuditLog(starttime, endtime, page, start, results) {
		let request = {
			managementIp: this._conn.getBaseUrlMgmtIp(),
			url:  this._conn.getBaseUrl() + '/public/v5_0/audit/list',
			operation: 'Retrieve Audit Log (3.5)'}

		let response
		try {
			response = await Connection.getAxios().post(request.url, {
				page: page,
				start: start,
				limit: 1000,
				sortInfo: {
					sortColumn: "auditTime",
					dir: "DESC"
				},
				extraTimeRange: {
					start: starttime,
					end: endtime,
					interval: 0
				}
			}, {
				headers: this._conn.getCommonHeaders()
			})
		} catch(err) {
			this._onControllerCallError(request, err)
			return err
			//throw new Error(this._onControllerCallError(request, err))
		}
		if (response.status === 200 && response.data) {
			_.reduce(response.data.list, (o, v, k) => {
				if (v.actionMsg !== 'Log on' && v.actionMsg !== 'Log off') { // excluse the login/logout messages
					const audit = {}
					audit.action = v.actionMsg
					audit.object = v.objectMsg
					audit.message = v.msgMsg
					audit.auditTime = v.auditTime
					audit.createUserName = v.createUserName
					audit.ipAddress = v.ipAddress
					o.push(audit)
				}
				return o
			}, results)
			if (response.data.hasMore) {
				await this._getAuditLog(starttime, endtime, page+1, start+1000, results)
			}
			return results;
		} else {
			this._onControllerCallError(request, response)
			return response.data
			//throw new Error(this._onControllerCallResponseError(request, response))
		}
	}
  
}

module.exports = Backup35;
