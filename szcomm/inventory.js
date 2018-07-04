const _ = require('lodash');
let Connection = require('./connection');
let logger = require("../config/logger.config");
let ClusterModel = require('../models/ClusterModel');


const osTypeMap = {
  ['1']: {name: 'windows', description: 'Windows'},
  ['3']: {name: 'android', description: 'Android'},
  ['4']: {name: 'iOS', description: 'Apple iOS'},
  ['5']: {name: 'macOS', description: 'MAC OS'},
  ['6']: {name: 'linux', description: 'Linux'},
  ['7']: {name: 'voip',  description: 'VoIP'},
  ['8']: {name: 'gaming', description: 'Gaming'},
  ['9']: {name: 'printers', description: 'Printers'},
  ['10']: {name: 'blackberry', description: 'BlackBerry'},
  ['11']: {name: 'others', description: 'Others'},
  ['12']: {name: 'chromeOS', description: 'Chrome OS'}
}

class Inventory {

  constructor(conn, clusterName, isTest, overallProgressTracker, onComplete) {
	this._conn = conn
    this._clusterName = clusterName
    this._isTest = isTest
    this._overallProgressTracker = overallProgressTracker
    this._onComplete = onComplete // the callback function
	this._progressTracker = {operationCount: 5, completeCount: 0, successCount: 0}
	
  }

  _getClusterName() {
    if (this._clusterName) {
      return this._clusterName
    } else {
      return this._conn.getBaseUrlMgmtIp()
    }
  }   
  
  async _getSmartZoneData() {    
	let systemsummary = await this._getSystemSummary()
	let zoneinventory = await this._getZoneInventory()
	let cplist = await this._getCpList()
	let dplist = await this._getDpList()
	return {"systemsummary" : systemsummary, "zoneinventory" : zoneinventory, "cplist" : cplist, "dplist" : dplist}
  }
  
  _getSystemSummary() {
    var selfthis = this;
	let request = {
      managementIp: selfthis._conn.getBaseUrlMgmtIp(),
      clusterName: selfthis._getClusterName(),
      url:  selfthis._conn.getBaseUrl() + '/scg/planes/systemSummary',
      operation: 'Get System Summary'
    }
    return Connection.getAxios().get(request.url, {
      headers: selfthis._conn.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        selfthis._onControllerCallSuccess(request)

        let sz = {}, data = response.data.data
        sz.version = data.version
        sz.model = selfthis._cpModelConverter(data.model)
        sz.clusterName = data.clusterName
        if (!selfthis._clusterName) {
          selfthis._clusterName = sz.clusterName
        }
        switch (data.clusterState) {
          case 'In_Service':
            sz.clusterState = 'online'
            break
          case 'Out_Of_Service':
            sz.clusterState = 'offline'
            break
          default:
            sz.clusterState = 'flagged'
        }
        const licenseStr = data.controllerLicenseSummary.split('/')
        sz.apLicenseTotal = parseInt(licenseStr[1])
        sz.apLicenseConsumed = parseInt(licenseStr[0])

        selfthis._conn.setVersion(sz.version)
		return sz;		
      } else {
        selfthis._onControllerCallResponseError(request, response)
      }
    }).catch((err) => {
      selfthis._onControllerCallError(request, err)
    })
  }
  
  _handleTaskComplete() {
    if (this._isTest) {
      this._conn.logoutWithCallbacks((success, request, response, error) => {
        if (success) {
          this._overallProgressTracker.successTaskCount ++
          this._onTestSuccess(request)
        } else {
          this._onTestFailure(request, response, error)
        }
        this._onTaskComplete()
      })
    } else {
      if (this._progressTracker.operationCount === this._progressTracker.successCount) {

        // all server calls are successful, make sure we change the connection state to online
        this._updateConnectionState('online')
        this._overallProgressTracker.successTaskCount ++
      }
      this._onTaskComplete()
    }
  }

  _onTestSuccess(request) {
    const managementIp = request.managementIp
    logger.info('Connection test for controller (%s) completed successfully', managementIp)
  }

  _onTestFailure(request, response, error) {
    try {
      const managementIp = request.managementIp
      let message = null
      if (response) {
        message = 'Connection test of ' + managementIp + ' failed: operation (' + request.operation + ') failed with status code (' + response.status + ') and response (' + Connection.stringifyResponseData(response.data) + ')'
      } else if (error) {
        if (error.response) {
          message = 'Connection test of ' + managementIp + ' failed: operation (' + request.operation + ') failed with status code (' + error.response.status + ') and response (' + Connection.stringifyResponseData(error.response.data) + ')'
        } else {
          message = 'Connection test of ' + managementIp + ' failed: operation (' + request.operation + ') failed with error (' + error.message + ')'
        }
      }
      logger.error(message)
    } catch (err) {
      logger.error('Conntection test of (%s) failed with unexpected error', request.managementIp)
      logger.error(err)
    }
  }

  _onTaskComplete() {
    this._overallProgressTracker.completeTaskCount++
    logger.info('Scheduled inventory task completed for controller (%s) with summary status (%j)', this._getClusterName(), this._overallProgressTracker)
    if (this._overallProgressTracker.pendingTaskCount === this._overallProgressTracker.completeTaskCount) {
      if (!this._isTest) {
        // notify client session to refresh data
        logger.info('Scheduled inventory task completed for all controllers, notify client to refresh data')
      }
      if (this._onComplete) {
        this._onComplete()
      }
    }
  }

  _updateConnectionState(state) {
    var selfthis = this;
	if (this._isTest) {
      return // do not update database for test connection
    }
    
	let connectedManagementIp  = this._conn.getBaseUrlMgmtIp()
    let connectionState = null
	
	if(state == 'offline'){
		connectionState = 0
	}
	if(state == 'online'){
		connectionState = 1
	}
	if(state == 'flagged'){
		connectionState = 2
	}
	ClusterModel.findOneAndUpdate({ ip: connectedManagementIp }, { status : connectionState }, function(err) {
		if (err){
			logger.info('update connection state of contoller (%s) failed with error (%s)', selfthis._getClusterName(), err.message)
		}else{
			logger.info('update connection state as (%s) of contoller (%s) finished successfully', state, selfthis._getClusterName())
		}
	})
  }

  _handleConnectionStateAlarm(state) {
    const controllerId = this._conn.getControllerId()
  }

  _handleClusterStateAlarm(state) {
    const controllerId = this._conn.getControllerId()    
  }

  _handleCpStateAlarm(state, cpKey, cpIp) {
    const controllerId = this._conn.getControllerId()    
  }

  _handleDpStateAlarm(state, dpKey, dpIp) {
    const controllerId = this._conn.getControllerId()   
  }

  async _handleStateAlarm(existingAlarms, state, alarmCode, message, controllerId, cpControllerKey, dpControllerKey) {
    try {
      
    } catch (err) {
      logger.error('Controller (%s) handleStateAlarm failed with error (%s)', this._getClusterName(), err.message)
      logger.error(err)
    }
  }

  // save the error to connection db
  _handleControllerCallError(request, response, error) {
    if (!this._isTest) {
      this._updateConnectionState('flagged')
    } else { // only send error notication for test connection
      this._onTestFailure(request, response, error)
    }
  }

  _onControllerCallSuccess(request) {
    //logger.info('operation (%s) on controller (%s) finished successfully', request.operation, this._getClusterName())
    this._progressTracker.completeCount++
    this._progressTracker.successCount++
    if (this._progressTracker.operationCount === this._progressTracker.completeCount) {
      this._handleTaskComplete()
    }
  }

  _onControllerCallResponseError(request, response) {
    logger.error('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
         request.operation, request.clusterName, response.status, Connection.stringifyResponseData(response.data))
    logger.error(response.data)

    this._handleControllerCallError(request, response, null)

    if (failedCount) {
      this._progressTracker.completeCount += failedCount
    } else {
      this._progressTracker.completeCount++
    }
    if (this._progressTracker.operationCount === this._progressTracker.completeCount) {
      this._handleTaskComplete()
    }
  }

  _onControllerCallError(request, error, failedCount) {
    if (error.response) {
      logger.error('operation (%s) on controller (%s) failed with status (%s) and response (%s)',
            request.operation, request.clusterName, error.response.status, Connection.stringifyResponseData(error.response.data))
      logger.error(error.response.data)
    } else {
      logger.error('operation (%s) on controller (%s) failed with error (%s)',
            request.operation, request.clusterName, error.message)
      logger.error(error)
    }

    this._handleControllerCallError(request, null, error)

    if (failedCount) {
      this._progressTracker.completeCount += failedCount
    } else {
      this._progressTracker.completeCount++
    }
    if (this._progressTracker.operationCount === this._progressTracker.completeCount) {
      this._handleTaskComplete()
    }
  }

  _cpStatusConverter(value) {
    //Online, Offline, Degraded
    if (value === 'Online') {
      return 'online'
    } else if (value === 'Offline') {
      return 'offline'
    } else {
      return 'flagged'
    }
  }

  _cpModelConverter(value) {
    //SCG200, SZ104, SZ124, vSCGc, vSCGe, SZ300
    if (value === 'vSCGc') {
      return 'vSZ-H'
    } else if (value === 'vSCGe') {
      return 'vSZ-E'
    } else if (value === 'WSG0001') {
      return 'SCG200'
    } else {
      return value
    }
  }

  _parseDiskInfo(value) {
    //"Total=524953480, Used=7356648, Free=517596832"
    const result = {
      diskTotal: 0,
      diskUsed: 0
    }
    if (!value) {
      return result
    }
    _.forEach(_.split(value, ','), (token) => {
      token = _.trim(token)
      const nv = _.split(token, '=')
      if (nv[0] === 'Total') {
        result.diskTotal = _.parseInt(nv[1])
      } else if (nv[0] === 'Used') {
        result.diskUsed = _.parseInt(nv[1])
      }
    })
    return result
  }

  _dpStatusConverter(value) {
    // Initializing(0), Configuring(1), Running(2), Fault(3), NONIP(4), Disconnected(5), Rebooting(6), Shutdown(7), Stopped(8), HeartbeatLost(9)
    if (value === 'Running' || value === '2') {
      return 'online'
    } else if (value === 'Rebooting' || value === 'Shutdown' || value === 'Stopped' ||
               value === '6' || value === '7' || value === '8') {
      return 'offline'
    } else {
      return 'flagged'
    }
  }

}

module.exports = Inventory
