var request = require('request');
var Q = require('q');
var logger = require("../config/logger.config");

var controllerVersion = "";
var apiVersion = "";
var rawCookie = "";
var isValidSession = false;

/*
   const url = 'https://' + managementIp + ':8443/wsg/api/scg/session/login'
*/

function CommonCluster(IpAddress) {
	this.apiBaseUrl = "https://"+IpAddress + ":8443/wsg/api/public";
	this.internalApiBaseUrl = "https://"+IpAddress + ":8443/wsg/api/scg";
	this.username = "admin";
	this.password = "Ruckus123$";
	if(this.ClusterIp != IpAddress){
		isValidSession = false;
	}
	this.ClusterIp = IpAddress;	
}

/*
   const url = 'https://' + managementIp + ':8443/wsg/api/scg/session/login'
*/

//get valid session 
CommonCluster.prototype.login = function(){
	logger.info("Common Cluster Login code start here");
	var defer = Q.defer();	
	var apiUrl = this.apiBaseUrl+"/v6_0/session";
	var bodyData = '{"username":"'+this.username+'","password":"'+this.password+'"}'; 
	//check if session is valid or not
	if(!isValidSession){
		request({
			method: 'POST',
			url:  apiUrl,
			rejectUnauthorized: false, 
			headers: {
				'Content-Type': 'application/json'
			},
			body: bodyData,
		}, function(error, response, body) {
			try{
				logger.info("login API promise response : "+error);
				logger.info("login API promise response : "+response);
				if (response && response.statusCode == 200) {
					body = JSON.parse(body);
					controllerVersion = body.controllerVersion;
					var versionArr = controllerVersion.split(".");
					apiVersion = 'v'+versionArr[1]+'_'+versionArr[2];
					rawCookie = response.headers["set-cookie"];
					isValidSession = true;
					defer.resolve(body); 
				}else{
					defer.reject("Can not login to the SmartZone successfully");
				}
			} catch(e){
				logger.info("login API promise exception : "+e);
				defer.reject(e);
			}
		});
	}else{
		body = {"controllerVersion":controllerVersion};
		defer.resolve(body); 
	}
	return defer.promise;
};

/*
C:\CDS\routes>node testCommonCluster.js
testing common cluster
get valid session : https://10.150.84.49:8443/wsg/api/scg/session/login
login API promise response : null
login API promise response : [object Object]
{ success: true, error: null }
Cookie : JSESSIONID=F9EC24C42C5DB5AA322A8DD35A6F5E2D; Path=/wsg/; Secure; HttpOn
ly
login API promise resolve : {"success":true,"error":null}
{ success: true, error: null }
*/

//get valid session 
CommonCluster.prototype.login34 = function(){
	var defer = Q.defer();	
	var apiUrl = "https://"+ this.ClusterIp + ":8443/wsg/api/scg/session/login"
	var bodyData = '{"username":"'+this.username+'","password":"'+this.password+'"}'; 
	//check if session is valid or not
	if(!isValidSession){
		request({
			method: 'POST',
			url:  apiUrl,
			rejectUnauthorized: false, 
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'				
			},
			//data:bodyData
			body: bodyData,
		}, function(error, response, body) {
			try{
				logger.info("login API promise Error : "+error);
				if (response){
					logger.info("response STATUS CODE: "+response.statusCode);
				}
				if (response && response.statusCode == 200) {
					body = JSON.parse(body);
					controllerVersion = body.controllerVersion;
					var versionArr = controllerVersion.split(".");
					apiVersion = 'v'+versionArr[1]+'_'+versionArr[2];
					apiVersion = "v4_0";
					//apiBaseUrl = "https://10.150.84.49:7443/api/public";  
					rawCookie = response.headers["set-cookie"];
					isValidSession = true;					
					defer.resolve(body); 
				}else{
					logger.info("login API promise reject : "+body);
					defer.reject("Can not login to the SmartZone successfully");
				}
			} catch(e){
				logger.info("login API promise exception : "+e);
				defer.reject(e);
			}
		});
	}else{
		body = {"controllerVersion":controllerVersion};
		defer.resolve(body); 
	}
	return defer.promise;
};

//Get the list of IP addresses to be sent to the AP.
CommonCluster.prototype.getControllerMgmtIP34 = function(){
	var defer = Q.defer();
    var apiUrl = apiBaseUrl+"/"+apiVersion+"/controller";  

/*
    let request = {
      managementIp: this._conn.getBaseUrlMgmtIp(),
      clusterName: this._getClusterName(),
      url:  apiUrl, //this._conn.getBaseUrl() + '/scg/planes/systemSummary',
      operation: 'Get System Summary'
    }
*/
	request({
        method: 'GET',
        rejectUnauthorized: false,
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json;charset=UTF-8'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			logger.info("Error : "+error);
			if(response){
				logger.info("response.statusCode "+response.statusCode);
			}
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				defer.reject(body);
			}
        } catch(e){
			logger.info("getControllerMgmtIP API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};


//Get the list of AP_Zones from the controller
CommonCluster.prototype.getzones34 = function(){
	var defer = Q.defer();
    var apiUrl = apiBaseUrl+"/"+apiVersion+"/rkszones";
	request({
        method: 'GET',
        rejectUnauthorized: false,
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				logger.info("getzones API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("getzones API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};


//Get the list of IP addresses to be sent to the AP.
CommonCluster.prototype.getControllerMgmtIP = function(){
	var defer = Q.defer();
    var apiUrl = this.apiBaseUrl+"/"+apiVersion+"/controller";
	request({
        method: 'GET',
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				logger.info("getControllerMgmtIP API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("getControllerMgmtIP API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};

//Get the list of AP_Zones from the controller
CommonCluster.prototype.getzones = function(){
	var defer = Q.defer();
    var apiUrl = this.apiBaseUrl+"/"+apiVersion+"/rkszones";
	request({
        method: 'GET',
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				logger.info("getzones API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("getzones API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};


//Fetch list of APs associated on the controller per zone
CommonCluster.prototype.getAllTheAPs = function(){
	var defer = Q.defer();
    var apiUrl = this.apiBaseUrl+"/"+apiVersion+"/aps";
	request({
        method: 'GET',
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				logger.info("getAllTheAPs API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("getAllTheAPs API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};

//Fetch the operational information of an AP
CommonCluster.prototype.GetAP = function(APSerialNumber){
	var defer = Q.defer();
    var apiUrl = this.apiBaseUrl+"/"+apiVersion+"/aps/"+APSerialNumber+"/operational/summary";
	request({
        method: 'GET',
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				logger.info("GetAP API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("GetAP API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};

//Add AP to zone
CommonCluster.prototype.AddAp = function(APName, APSerialNumber, ApZoneId, ManualActivateReq){
	var defer = Q.defer();
        
    var apiUrl = this.internalApiBaseUrl+"/aps/config/preprovision/"+ApZoneId;
    //this.internalApiBaseUrl = "https://"+IpAddress + ":8443/wsg/api/scg";
    apiUrl = "https://"+"10.150.84.49" + ":7443/wsg/api/scg" + "/aps/config/preprovision/" + ApZoneId;
	var bodyData = '{"deviceName":"'+APName+'", "serial":"'+APSerialNumber+'", "manualActivateReq":"'+ManualActivateReq+'"}'; 
	request({
        method: 'POST',
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
                rejectUnauthorized: false,
		body: bodyData,
		url:  apiUrl,
    }, function(error, response, body) {
		try{
            logger.info("Error : " + error);
			if(response){
				logger.info("Response status code:" + response.statusCode);
			}
			if (response && response.statusCode == 200) {
				defer.resolve(body); 
			}else{
				logger.info("AddAp API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("AddAp API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};

//Delete AP from a zone
CommonCluster.prototype.deleteAp = function(APSerialNumber){
	var defer = Q.defer();
    var apiUrl = this.apiBaseUrl+"/"+apiVersion+"/aps/"+APSerialNumber;
	request({
        method: 'DELETE',
		headers: {
			'Cookie': rawCookie,
			'Content-Type': 'application/json'
		},
		url:  apiUrl,
    }, function(error, response, body) {
		try{
			if (response && response.statusCode == 204) {
				body = '{"success": true,"error": null}';
				defer.resolve(body); 
			}else{
				logger.info("deleteAp API promise reject : "+body);
				defer.reject(body);
			}
        } catch(e){
			logger.info("deleteAp API promise exception : "+e);
			defer.reject(e);
		}
    });
	return defer.promise;
};

module.exports = CommonCluster;

