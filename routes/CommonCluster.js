var request = require('request');
var axios = require('axios')
var Q = require('q');
var logger = require("../config/logger.config");
var Connection = require('../szcomm/connection');
var ClusterModel = require('../models/ClusterModel');
var aputils = require('../utils/aputils');
Connection.connections = {}

class CommonCluster {
	
  constructor(IpAddress, username, password) {
	this.isipv6 = aputils.isIpv6address(IpAddress);
	this.connectionIp = IpAddress;
	if(this.isipv6){
		IpAddress = '['+IpAddress+']';
	}
	this.apiBaseUrl = "https://"+IpAddress + ":8443/wsg/api/public";
	this.internalApiBaseUrl = "https://"+IpAddress + ":8443/wsg/api/scg";
	this.username = username;
	this.password = password;
	this.ClusterIp = IpAddress;
	this.controllerVersion = "";
	this.connObj = "";
	this.apiVersion = "";
	this.rawCookie = "";	
  }

  //get valid session 
  async login(){
	var view = this;
	let controller = await ClusterModel.findOne({ip : view.connectionIp});
	return new Promise((resolve, reject) => {
		let controllerId = controller ? controller.id : ''
		let controllerIp = controller ? controller.ip : view.connectionIp
		let controllerUsername = view.username
		let controllerPassword = view.password
		let conn
		if(controllerId){
			 conn = Connection.findConnection(controllerId)
			if (!conn) {
			  conn = new Connection(controllerId, controllerIp, controllerUsername, controllerPassword)
			  Connection.register(conn)
			}
		}else{
			conn = new Connection(controllerId, controllerIp, controllerUsername, controllerPassword)	
			Connection.register(conn)
		}
		// the available IPs
		let availableIps = null
		try {
		  availableIps = controller ? (controller.managementips ? controller.managementips : null) : [view.connectionIp]
		  conn.updateAvailableIps(availableIps)
		} catch (err) {
		  logger.info('failed to retrieve the list of management ip for controller (%s)', controllerIp)
		  logger.info(err)
		}
		if (conn.is35orLater()) {
			conn._port7443 = false
		}else{
			conn.setPortFor34()
		}
		conn.getValidateSession(function(success, request, response, error){
			if(success){
				view.connObj = conn
				if (conn.is35orLater()) {
					view.ClusterIp = conn.getBaseUrlMgmtIp()
					view.apiBaseUrl = "https://"+view.ClusterIp + ":8443/wsg/api/public";
					view.internalApiBaseUrl = "https://"+view.ClusterIp + ":8443/wsg/api/scg";
					view.rawCookie = conn._cookie
					view.apiVersion = 'v5_0'; 
					resolve(true)
				}else{
					view.ClusterIp = conn.getBaseUrlMgmtIp()
					view.rawCookie = conn._cookie
					view.apiVersion = 'v4_0'; 
					view.apiBaseUrl = "https://"+view.ClusterIp+":7443/api/public"; 
					view.internalApiBaseUrl = "https://"+view.ClusterIp + ":7443/api/public";
					resolve(true)
				}
			}else{
				if(response && response.data){
					reject(response.data.message);
				}else{
					reject("Unreachable")
				}
			}
		})
	})
  }

  //Get the list of IP addresses to be sent to the AP.
  getControllerMgmtIP(){
	var view = this;
	var defer = Q.defer();
    var apiUrl = view.apiBaseUrl+"/"+view.apiVersion+"/controller";
	request({
        method: 'GET',
		headers: {
			'Cookie': view.rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				logger.info("operation (Get Controller Info) on controller ("+view.ClusterIp+") successful")
				defer.resolve(body); 
			}else{
				logger.info("operation (Get Controller Info) on controller ("+view.ClusterIp+") failed with error")
				logger.error(body)
				defer.reject(body);
			}
        } catch(e){
			logger.info("operation (Get Controller Info) on controller ("+view.ClusterIp+") failed with error")
			logger.error(e)
			defer.reject(e);
		}
    });
	return defer.promise;
  }

  //Get the list of AP_Zones from the controller
  getzones(){
	var view = this;
	var defer = Q.defer();
    var apiUrl = view.apiBaseUrl+"/"+view.apiVersion+"/rkszones";
	request({
        method: 'GET',
		headers: {
			'Cookie': view.rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				logger.info("operation (Get Controller Zones List) on controller ("+view.ClusterIp+") successful")
				defer.resolve(body); 
			}else{
				logger.info("operation (Get Controller Zones List) on controller ("+view.ClusterIp+") failed with error")
				logger.error(body)
				defer.reject(body);
			}
        } catch(e){
			logger.info("operation (Get Controller Zones List) on controller ("+view.ClusterIp+") failed with error")
			logger.error(e)
			defer.reject(e);
		}
    });
	return defer.promise;
  }


  //Fetch list of APs associated on the controller per zone
  getAllTheAPs(){
	var view = this;
	return new Promise(function(resolve,reject){
        recursiveCall(0,[])
        //need this extra fn due to recursion
        function recursiveCall(page, apListArr){
			var pager = page ? page : 0;
			var apList = apListArr;
			var listsize = 1000;
			var index = listsize*pager;
			var hasmoredata = false;
			var apiUrl = view.apiBaseUrl+"/"+view.apiVersion+"/aps?listSize="+listsize+"&index="+index;
			axios.get(apiUrl, {
				headers: {
					'Cookie': view.rawCookie,
					'Content-Type': 'application/json'
				}
			})
			.then(response => {
				if (response && response.status == 200) {
					if(response.data.hasMore){
						apList = response.data.list.concat(apList);
						recursiveCall(pager+1, apList)
					}else{
						apList = response.data.list.concat(apList);
						resolve(JSON.stringify({list : apList}))
					}
				}else{
					logger.info("GET AP API Failed response.status : "+response.status);
					reject("GET AP API Failed with error code : "+response.status);
				}
			}).catch((error) => {
				logger.info("GET AP API Failed with error : "+error);
				reject(error)
			})
        }
    })
  }

  //Fetch the operational information of an AP
  GetAP(APSerialNumber){
	var view = this;
	var defer = Q.defer();
    var apiUrl = view.apiBaseUrl+"/"+view.apiVersion+"/aps/"+APSerialNumber+"/operational/summary";
	request({
        method: 'GET',
		headers: {
			'Cookie': view.rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				logger.info("operation (Get AP ["+APSerialNumber+"] Info) on controller ("+view.ClusterIp+") successful")
				defer.resolve(body); 
			}else{
				logger.info("operation (Get AP ["+APSerialNumber+"] Info) on controller ("+view.ClusterIp+") failed with error")
				logger.error(body)
				defer.reject(body);
			}
        } catch(e){
			logger.info("operation (Get AP ["+APSerialNumber+"] Info) on controller ("+view.ClusterIp+") failed with error")
			logger.error(e)
			defer.reject(e);
		}
    });
	return defer.promise;
  }

  //Add AP to zone
  async AddAp(APName, APSerialNumber, ApZoneId, ManualActivateReq){
	try{
		var view = this;
		var defer = Q.defer();
		if(view.apiVersion == "v4_0"){
			//We need new connection for port 8443 to add ap in case of controller version 3.4
			let controller = await ClusterModel.findOne({ip : view.connectionIp});
			let controllerId = controller ? controller.id : ''
			let controllerIp = controller ? controller.ip : view.connectionIp
			let controllerUsername = view.username
			let controllerPassword = view.password
			let controllerName = controller ? controller.name : ''
			//let conn = new Connection(controllerId, controllerIp, controllerUsername, controllerPassword)
			let  conn = Connection.findConnection(controllerName)
			if (!conn) {
			  conn = new Connection(controllerName, controllerIp, controllerUsername, controllerPassword)
			  Connection.register(conn)
			}
			// the available IPs
			let availableIps = null
			try {
			  availableIps = controller ? (controller.managementips ? controller.managementips : null) : [view.connectionIp]
			  conn.updateAvailableIps(availableIps)
			} catch (err) {
			  logger.info('failed to retrieve the list of management ip for controller (%s)', controllerIp)
			  logger.info(err)
			}
			conn.getValidateSession(function(success, req, res, resErr){
				if(success){
					if (!conn.is35orLater()) {
						view.ClusterIp = conn.getBaseUrlMgmtIp()
						var apiUrl = "https://"+view.ClusterIp+":8443/wsg/api/scg/aps/config/preprovision/"+ApZoneId;
						var bodyData = '{"deviceName":"'+APName+'", "serial":"'+APSerialNumber+'", "manualActivateReq":"'+ManualActivateReq+'"}'; 
						request({
							method: 'POST',
							headers: {
								'Cookie': conn._cookie,
								'Content-Type': 'application/json'
							},
							body: bodyData,
							url:  apiUrl,
						}, function(error, response, body) {
							if (response && response.statusCode == 200) {
								logger.info("operation (Add AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") successful")
								defer.resolve(body); 
							}else{
								logger.info("operation (Add AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") failed with error")
								logger.error(body)
								defer.reject(body);
							}
						});
					}
				}else{
					logger.info("operation (Add AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") failed with error")
					logger.error(res)
					if(res && res.data){
						defer.reject(res.data.message);
					}else{
						defer.reject("Unreachable")
					}
				}
			})	
		}else{
			var apiUrl = view.internalApiBaseUrl+"/aps/config/preprovision/"+ApZoneId;
			var bodyData = '{"deviceName":"'+APName+'", "serial":"'+APSerialNumber+'", "manualActivateReq":"'+ManualActivateReq+'"}'; 
			request({
				method: 'POST',
				headers: {
					'Cookie': view.rawCookie,
					'Content-Type': 'application/json'
				},
				body: bodyData,
				url:  apiUrl,
			}, function(error, response, body) {
				if (response && response.statusCode == 200) {
					logger.info("operation (Add AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") successful")
					defer.resolve(body); 
				}else{
					logger.info("operation (Add AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") failed with error")
					logger.error(body)
					defer.reject(body);
				}
			});
		}
	} catch(e){
		logger.info("operation (Add AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") failed with error")
		logger.error(e)
		defer.reject(e);
	}
	return defer.promise;
  }

  //Delete AP from a zone
  deleteAp(APSerialNumber){
	var view = this;
	var defer = Q.defer();
    var apiUrl = view.apiBaseUrl+"/"+view.apiVersion+"/aps/"+APSerialNumber;
	request({
        method: 'DELETE',
		headers: {
			'Cookie': view.rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 204) {
				logger.info("operation (Delete AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") successful")
				body = '{"success": true,"error": null}';
				defer.resolve(body); 
			}else if(response && response.statusCode != 204){
				logger.info("operation (Delete AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") successful")
				defer.resolve(body);
			}else{
				logger.info("operation (Delete AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") failed with error")
				logger.error(body)
				defer.reject(body);
			}
        } catch(e){
			logger.info("operation (Delete AP ["+APSerialNumber+"]) on controller ("+view.ClusterIp+") failed with error")
			logger.error(e)
			defer.reject(e);
		}
    });
	return defer.promise;
  }

}
module.exports = CommonCluster;