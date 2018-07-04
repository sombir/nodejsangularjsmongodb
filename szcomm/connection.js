/*
    Connection class is a singleton Class which will
    maintain the https sessions to the vSZ.

 */

var axios = require('axios');
var co = require('co');
var util = require('util');
var logger = require("../config/logger.config");
const _ = require('lodash');
var aputils = require('../utils/aputils');

const MAX_DISCONNECT_MILLISECONDS = 30 * 60 * 1000 // 30 minutes

class Connection {

  static getAxios() {
    if (!Connection.axios) {
      Connection.axios = axios.create()
      Connection.axios.defaults.timeout = 60000
    }
    return Connection.axios
  }

  static register(conn) {
    if (!Connection.connections) {
      Connection.connections = {}
    }
    logger.info('register connection for controller (%s)',  conn._controllerId)
    Connection.connections[conn._controllerId] = conn
  }

  static unregister(controllerId) {
    logger.info('unregister connection for controller (%s)', controllerId)
    let conn = Connection.connections[controllerId]
    if (conn) {
      conn.logoutWithCallbacks((success, request, response, error) => {
        // TODO
      })
      Connection.connections[controllerId]= null
    }
  }

  static updateConnection(controllerId, conn) {
    let existConn = Connection.connections[controllerId]
    if (existConn) {
      // update the connection parameter
      _.assign(existConn, conn)
      logger.info(existConn)
    }
  }

  static findConnection(controllerId) {
    return Connection.connections[controllerId]
  }

  static stringifyResponseData(data) {
    if (_.isString(data)) {
      return data
    } else if (data.error) { // SCG internal error
      return data.error.message
    } else if (_.isObject(data)) {
      return JSON.stringify(data)
    }
  }

  constructor(controllerId, managementIp, username, password) {
    this.isipv6 = aputils.isIpv6address(managementIp);
	this.isipv4 = aputils.isIpv4address(managementIp);
	if(this.isipv6){
		managementIp = '['+managementIp+']';
	}
	this._controllerId = controllerId
    this._connectedIp = managementIp
    this._username = username
    this._password = password
    this._cookie = null
    this._loginDomain = null
    this._availableIps = []
    this._version = null
    this._auditProperties = null
    this._disconnectedAt = null
    this._port7443 = false
  }

  getBaseUrlMgmtIp() {
    return this._connectedIp
  }

  getBaseUrl() {
    return 'https://' + this._connectedIp + ':8443/wsg/api'
  }

  is35orLater() {
    if (this._version) {
      let major, minor
      this._version.substring(0, 3).split('.').forEach((value, index) => {
        if (index === 0) {
          major = parseInt(value)
        } else {
          minor = parseInt(value)
        }
      })
      return major > 3 || (major === 3 && minor >= 5)
    } else {
      // no version information, assume older version
      return false
    }
  }

  is351orLater() {
    if (this._version) {
      let major, minor, patch
      this._version.substring(0, 5).split('.').forEach((value, index) => {
        if (index === 0) {
          major = parseInt(value)
        } else if (index === 1) {
          minor = parseInt(value)
        } else {
          patch = parseInt(value)
        }
      })
      return major > 3 || (major === 3 && minor > 5) || (major === 3 && minor === 5 && patch >= 1)
    } else {
      // no version information, assume older version
      return false
    }
  }

  getCommonHeaders() {
    return {
      'Accept-Encoding': 'gzip, deflate, sdch, br',
      'Content-Type': 'application/json;charset=UTF-8',
      'Cookie': this._cookie
    }
  }

  updateAvailableIps(newIps) {
    this._availableIps = newIps
	logger.info('updateAvailableIps : '+Connection.stringifyResponseData(this._availableIps))
  }

  getControllerId() {
    return this._controllerId
  }

  getLoginDomain() {
    return this._loginDomain
  }

  getCookie() {
    return this._cookie
  }

  getVersion() {
    return this._version
  }

  setVersion(version) {
    if (version !== this._version) {
      this._version = version
      this._auditProperties = null
    }
  }
  setPortFor34(version) {
    this._port7443 = true
  }

  async getValidateSessionAsync() {
    return new Promise((resolve, reject) => {
      this.getValidateSession((success, request, response, error) => {
        if (success) {
          resolve(true)
        } else {
          reject(false)
        }
      })
    })
  }

  // obtain a valid session with the controller system
  async getValidateSession(callback) {
    //if host name is domain name then check for dns lookup
	if(!this.isipv6 && !this.isipv4){
		logger.info("Now first trying to resolve dns for hostname from back process file : "+this.getBaseUrlMgmtIp())
		var dnsResult = await aputils.dnslookup(this.getBaseUrlMgmtIp());
		if(dnsResult && dnsResult.result && dnsResult.family){
			if(dnsResult.result){
				this._connectedIp = dnsResult.result
			}
		}
	}
	let request = {
      managementIp: this.getBaseUrlMgmtIp(),
      url: this.getBaseUrl() + '/scg/session/currentUser',
      operation: 'Validate Session'
    }
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    Connection.getAxios().get(request.url, {
      timeout: 5000, // shorter timeout value to avoid long wait
      headers: this.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        this._loginDomain = {domainUUID: response.data.data.domainUUID, domainName: response.data.data.domainName}
        logger.info('operation (%s) on controller (%s) successful, session is still active and valid', request.operation, request.managementIp)
        // callback invoked with success flag
        this._callback(callback, true, request)
      } else {
        // the current session has been invalidated
        logger.info('operation (%s) on controller (%s) failed. try to login again', request.operation,request.managementIp)
        this._cookie = null
        this._loginDomain = null
        // when no session occurred, try to relogin to current ip first
        // if cannot login, then try to switch to different node
        this._loginWithCallbacks(request.managementIp, (success, request, response, error) => {
          if (success) {
            if(this._port7443){
				this._callback(callback, success, request, response, error)	
			}else{
				this._getLoginDomain(callback)	
			}
          } else if (this._availableIps.length < 2) { // no more node to try
            this._callback(callback, success, request, response, error)
          } else {
            const failedIps = this.isipv6 ? [this._connectedIp.slice(1,-1)] :  [this._connectedIp]
            this._connectController(failedIps, callback)
          }
        })
      }
    }).catch((error) => {
      logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, error.message)
      logger.info("this._availableIps.length : "+this._availableIps.length)
      if (this._availableIps.length < 2) { // no more node to try
        this._callback(callback, false, request, null, error)
      } else {
        const failedIps = this.isipv6 ? [request.managementIp.slice(1,-1)] : [request.managementIp]
        this._connectController(failedIps, callback)
      }
    })
  }

  logoutWithCallbacks(callback) {
    let url = this.getBaseUrl()
    if (this.is35orLater()) {
      url = url + '/public/v5_0/session'
    } else {
      url = url + '/scg/session/logout'
    }
    let request = {
      managementIp: this.getBaseUrlMgmtIp(),
      url:  url,
      operation: 'Logout'
    }
    logger.info('logout controller (%s)', request.managementIp)
    Connection.getAxios().delete(request.url, {
      headers: this.getCommonHeaders()
    }).then((response) => {
      if ((this.is35orLater() && response.status === 200) ||
          (!this.is35orLater() && response.status === 200 && response.data && response.data.success)) {
        this._cookie = null
        this._loginDomain = null
        logger.info('operation (%s) on controller (%s) successful', request.operation, request.managementIp)
        this._disconnectedAt = null
        callback(true, request)
      } else {
        if (response.data.error) {
          logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, response.data.error.message)
        } else {
          logger.info('operation (%s) on controller (%s) failed with status (%s)', request.operation, request.managementIp, response.status)
          logger.info(response.data)
        }
        callback(false, request, response, null)
      }
    }).catch((error) => {
      logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, error.message)
      logger.info(error)
      callback(false, request, null, error)
    })
  }

  _callback(callback, success, request, response, error) {
    if (success) {
      this._disconnectedAt = null
    } else if (!this._disconnectedAt) {
      this._disconnectedAt = Date.now()
      logger.info('Connection to controller (%s) is down. Timestamp (%s)', request.managementIp, this._disconnectedAt)
    } else {
//      const duration = Date.now() - this._disconnectedAt
//      logger.info('Connection to controller (%s) has been down for (%s)', request.managementIp, duration)
//      if (duration > MAX_DISCONNECT_MILLISECONDS) {
//        logger.info('notify controller connection problem')
//        global.io.broadcast('NOTIFICATION', {
//          action: 'SZ_CONNECTION_DOWN',
//          payload: {
//            controllerId: this._controllerId,
//            type: 'CONNECTION_DOWN',
//            managementIp: request.managementIp,
//            message: 'Connection to controller (' + managementIp + ') has been down'
//          }
//        })
//      }
    }
    if (!response && error) {
      response = error.response
    }
    callback(success, request, response, error)
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

  _connectController(failedIps, callback) {
    const nextIps = _.difference(this._availableIps, failedIps)
    const nextIp = nextIps[0]
	let connectedIp = nextIp
	if(aputils.isIpv6address(nextIp)){
		connectedIp = '['+nextIp+']';
	}
    this._loginWithCallbacks(connectedIp, (success, request, response, error) => {
      if (success) {
        this._getLoginDomain(callback) // added in cds
		this._callback(callback, success, request)
      } else if (this._availableIps.length - failedIps.length > 1) {
        // still more node to try
        failedIps.push(nextIp)
        this._connectController(failedIps, callback)
      } else {
        // no more node to try
        this._callback(callback, success, request, response, error)
      }
    })
  }

  _loginWithCallbacks(managementIp, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    if (this.is35orLater()) {
      this._login35WithCallbacks(managementIp, true, callback)
    } else {
      if(this._port7443){
		this._login34WithPort7443Callbacks(managementIp, true, callback)
	  }else{
		this._login34WithCallbacks(managementIp, true, callback)  
	  }
	  
    }
  }

  _login34WithCallbacks(managementIp, fallback35, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    const url = 'https://' + managementIp + ':8443/wsg/api/scg/session/login'
    const method = 'put'
    const request = {
      managementIp: managementIp,
      url: url,
      operation: 'Login (3.4 and lower)'
    }
    Connection.getAxios().request({
      method: method,
      url: request.url,
      data: {
        userName: this._username,
        password: this._password
      },
      headers: {'Content-Type': 'application/json;charset=UTF-8'}
    })
    .then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        this._cookie = response.headers['set-cookie'][0].split(';')[0]
        this._connectedIp = request.managementIp
        this._version = null
        logger.info('operation (%s) on controller (%s) successful', request.operation, request.managementIp)
        this._updateManagementIp(request.managementIp)
        this._callback(callback, true, request)
      } else {
        if (response.data.error) {
          logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, response.data.error.message)
        } else {
          logger.info('operation (%s) on controller (%s) failed with status (%s)', request.operation, request.managementIp, response.status)
        }
        logger.info(response.data)
        if (fallback35) {
          this._login35WithCallbacks(managementIp, false, callback)
        } else {
          this._callback(callback, false, request, response)
        }
      }
    })
    .catch((err) => {
      logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, err.message)
      //logger.info(err)
      if (fallback35) {
        this._login35WithCallbacks(managementIp, false, callback)
      } else {
        this._callback(callback, false, request, null, err)
      }
    })
  }
  
  
  _login34WithPort7443Callbacks(managementIp, fallback35, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
	let url = 'https://' + managementIp + ':7443/api/public/v4_0/session'
	let method = 'post'
	let bodyData = {username: this._username, password: this._password}
	const request = {
      managementIp: managementIp,
      url: url,
      operation: 'Login (3.4 and lower with port 7443)'
    }
	Connection.getAxios().request({
      method: method,
      url: request.url,
      data: bodyData,
      headers: {'Content-Type': 'application/json;charset=UTF-8'}
    })
    .then((response) => {
	  if (response.status === 200 && response.data) {
		this._version = response.data.controllerVersion
		if (this.is35orLater()) {
			this._version = null
			logger.info('operation (%s) on controller (%s) successful but controller version is 3.5, try to login with 3.5', request.operation, request.managementIp)
			this._login35WithCallbacks(managementIp, false, callback)
		}else{
			this._cookie = response.headers['set-cookie'][0].split(';')[0]
			this._connectedIp = request.managementIp
			this._version = null		
			logger.info('operation (%s) on controller (%s) successful', request.operation, request.managementIp)
			this._updateManagementIp(request.managementIp)
			this._callback(callback, true, request)
		}
	  } else {
		if (response.data.error) {
		  logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, response.data.error.message)
		} else {
		  logger.info('operation (%s) on controller (%s) failed with status (%s)', request.operation, request.managementIp, response.status)
		}
		//logger.info(response.data)
		if (fallback35) {
		  this._login35WithCallbacks(managementIp, false, callback)
		} else {
		  this._callback(callback, false, request, response)
		}
	  } 
    })
    .catch((err) => {
      logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, err.message)
      if(err.response && err.response.data && err.response.data.errorCode == 202){
		this._callback(callback, false, request, err.response, err)  
	  }else{
		if (fallback35) {
			this._login35WithCallbacks(managementIp, false, callback)
		} else {
			this._callback(callback, false, request, null, err)
		}  
	  }
    })
  }

  _login35WithCallbacks(managementIp, fallback34, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    const url = 'https://' + managementIp + ':8443/wsg/api/public/v5_0/session'
    const method = 'post'
    const request = {
      managementIp: managementIp,
      url: url,
      operation: 'Login (3.5)'
    }
    Connection.getAxios().request({
      method: method,
      url: request.url,
      data: {
        userName: this._username,
        password: this._password
      },
      headers: {'Content-Type': 'application/json;charset=UTF-8'}
    })
    .then((response) => {
      if (response.status === 200 && response.data) {
        this._cookie = response.headers['set-cookie'][0].split(';')[0]
        this._connectedIp = request.managementIp
        logger.info('operation (%s) on controller (%s) successful', request.operation, request.managementIp)
        this._updateManagementIp(request.managementIp)
        this._version = response.data.controllerVersion
        this._callback(callback, true, request)
      }
    })
    .catch((err) => {
      console.log('----------------------------')
      console.log(err.response)
      if (err.response && err.response.data && err.response.data.message) {
        logger.info('operation (%s) on controller (%s) failed with status (%s) and error (%s)', request.operation, request.managementIp, err.response.status, err.response.data.message)
      } else {
        logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, err.message)
        logger.info(err)
      }
      if (fallback34) {
        if(this._port7443){
			this._login34WithPort7443Callbacks(managementIp, false, callback)
		}else{
			this._login34WithCallbacks(managementIp, false, callback)
		}
      } else {
        this._callback(callback, false, request, null, err)
      }
    })
  }

  _getLoginDomain(callback) {
    let request = {
      managementIp: this.getBaseUrlMgmtIp(),
      url: this.getBaseUrl() + '/scg/session/currentUser',
      operation: 'Get Login Domain'
    }
    Connection.getAxios().get(request.url, {
      headers: this.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        this._loginDomain = {domainUUID: response.data.data.domainUUID, domainName: response.data.data.domainName}
        logger.info('operation (%s) on controller (%s) successful', request.operation, request.managementIp)
        // callback invoked with success flag
        this._callback(callback, true, request)
      } else {
        // the current session has been invalidated
        if (response.data.error) {
          logger.info('operation (%s) to controller (%s) failed with error (%s)', request.operation, request.managementIp, response.data.error.message)
        } else {
          logger.info('operation (%s) to controller (%s) failed with status (%s)', request.operation, request.managementIp, response.status)
        }
        logger.info(response.data)
        this._callback(callback, false, request, response, null)
      }
    }).catch((error) => {
      logger.info('operation (%s) on controller (%s) failed with error (%s)', request.operation, request.managementIp, error.message)
      logger.info(error)
      this._callback(callback, false, request, null, error)
    })
  }

  // called when MoM connected to a different SZ node
  _updateManagementIp(managementIp) {
    const oldIp = this._connectedIp

    this._connectedIp = managementIp

    /*
	if (!this._isTest) {
      co(szModel.edit(this._controllerId, {connectedManagementIp: managementIp}))
      .then((val) => {
      }, (err) => {
        logger.info('update connected management IP of controller system (' +  oldIp + ') failed')
        logger.info(err)
      })
    }
	*/
  }
}

module.exports = Connection
