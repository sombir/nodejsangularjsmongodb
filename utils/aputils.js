var Q = require('q');
var logger = require("../config/logger.config")
const _ = require('lodash');
exports.getcdsclusterstate = function(connectionState, apStatus, apLastContacted){
	//Managed APs - CONNECTED/NOTCONNECTED/FLAGGED
	//UnManaged APs - PREPROVISIONED/STRANDED/NOTINCLUSTER/REJECTED
	//STRANDED APs - IF AP last contacted found & connection state is provisioned
	//Rejected APs - If default cluster not configured & AP comes from networks then it will be rejected 
	let cdsClusterState = '';
	if(apLastContacted && connectionState == 'Provisioned'){
		cdsClusterState = 'STRANDED';
	}else if(connectionState == 'Provisioned'){
		cdsClusterState = 'PREPROVISIONED';
	}else if(apStatus != '' && apStatus == 'Flagged' && connectionState == 'Connect'){
		cdsClusterState = 'FLAGGED';
	}else if(apStatus != '' && apStatus == 'Offline'){
		cdsClusterState = 'NOTCONNECTED';
	}else if(apStatus != '' && apStatus == 'Online'){
		cdsClusterState = 'CONNECTED';
	}else if(apStatus == '' && connectionState != 'Connect' && connectionState != 'Disconnect'){
		cdsClusterState = 'FLAGGED';
	}else if(connectionState == 'Connect'){
		cdsClusterState = 'CONNECTED';
	}else{
		cdsClusterState = 'NOTCONNECTED';
	}
  return cdsClusterState;
}

exports.getApState = function(connectionState){
	let cdsApState = '';
	if(connectionState == 'Connect'){
		cdsApState = 'Online';
	}else if(connectionState == 'Disconnect'){
		cdsApState = 'Offline';
	}else{
		cdsApState = 'Flagged';
	}
  return cdsApState;
}

exports.savebulkAps = function(records, Model, matchField){
  var view = this;
  return new Promise(function(resolve,reject){
    matchCriteria = matchField ? matchField : 'apserial';
    var bulk = Model.collection.initializeUnorderedBulkOp();
    records.forEach(function(record){
      var match = {'apserial' : record['apserial']};
      bulk.find(match).upsert().updateOne( { $set: record } );
    });
    bulk.execute(function(err, bulkres){
      if (err) {
        console.log('Error while save bulk aps')
        reject(err);
      }
      resolve(bulkres);
    })
  })
}

exports.filterApListbySerial = function(apArray, apserial){
	for (var i = 0; i < apArray.length; i++) {
		if (apArray[i]['serial'] == apserial) {
			return apArray[i];
		}
	}
	return null;
}

exports.filterCdsApList = function(apArray, apserial){
	for (var i = 0; i < apArray.length; i++) {
		if (apArray[i]['apserial'] == apserial) {
			return apArray[i];
		}
	}
	return null;
}

exports.checkDuplicateInObject = function(propertyName, inputArray) {
  let allObject = [];
  let uniObject = {};
  let dupObject = {};
  let dupCounter = 0;
  let UniCounter = 0;
  inputArray.map(function(item) {
    var itemPropertyName = item[propertyName]; 
    var apMac = item["apMac"]; 
	allObject.push({apserial: itemPropertyName, mac : apMac})
	if(uniObject.hasOwnProperty(itemPropertyName)){
		dupObject[itemPropertyName] = item[propertyName];
		dupCounter++;
	} else {
      uniObject[itemPropertyName] = item[propertyName];
	  UniCounter++
    }
  });
  //console.log('checkDuplicateInObject allObject : '+JSON.stringify(allObject));
  console.log('checkDuplicateInObject dupObject : '+JSON.stringify(dupObject));
  return "duplicate Counter : "+ dupCounter +" Unique Counter :  "+UniCounter;
}

exports.convertArraytoDictionary = function(propertyName, inputArray) {
	let dictionaryObject = {};
	inputArray.map(function(item) {
		var itemPropertyName = item[propertyName]; 
		dictionaryObject[itemPropertyName] = item;
	});
  return dictionaryObject;
}

exports.is35orLater = function(version) {
  if (version) {
      let major, minor
      version.substring(0, 3).split('.').forEach((value, index) => {
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


exports.getClientIp = function(req) {
  var ip = require('ip');
  var ipAddress = ''
  if(!req){
	  ipAddress = '-'
  }else{
	  if(req.headers['x-forwarded-for']){
		ipAddress = req.headers['x-forwarded-for'].split(',').pop()
	  }else if(req.headers['CF-Connecting-IP']){
		  ipAddress = req.headers['CF-Connecting-IP']
	  }else if(req.headers['True-Client-Ip']){
		  ipAddress = req.headers['True-Client-Ip']
	  }else if(req.headers['X-Real-IP']){
		  ipAddress = req.headers['X-Real-IP']
	  }else if(req.headers['X-Cluster-Client-IP']){
		  ipAddress = req.headers['X-Cluster-Client-IP']
	  }else if(req.connection && req.connection.remoteAddress){
		  ipAddress = req.connection.remoteAddress
	  }else if(req.socket && req.socket.remoteAddress){
		  ipAddress = req.socket.remoteAddress
	  } 
  }
  return ipAddress;
}

exports.isIpv6address = function(stripv6) {
	let iPv6Pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
	if(stripv6.match(iPv6Pattern)) {
	   return true;
	}else{
	   return false;
	}
}

exports.isIpv4address = function(stripv4) {
	let iPv4Pattern = /^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/;
	if(stripv4.match(iPv4Pattern)) {
	   return true;
	}else{
	   return false;
	}
}

exports.dnslookup = function(hostname) {
	var dns = require('dns');
	var selfthis = this;
	var counter = 0
	return new Promise(function(resolve,reject){
		_dnslookup(hostname)
		function _dnslookup(hostname) {				
		counter++
		dns.lookup(hostname, function(err, result, family) {
				if(!err && result){
					logger.info("hostname ["+hostname+"] dns resolve as below in "+counter+" try")
					logger.info({"result" : result, "family" : family})
					resolve({"result" : result, "family" : family})
				}else{
					if(counter < 10){
						_dnslookup(hostname)		
					}else{
						logger.info("hostname ["+hostname+"] dns not resolve after "+counter+" try also")
						resolve(false)
					}
				}
			});
		}
	})
}
exports.serialnumberValidator = function(serial) {
	let numbers = /^[-+]?[0-9]+$/;
	let error = {lengthError:null,numberError:null};
	if (serial) {
		if (serial.length != 12) {
			error.lengthError = serial;
		}
		if (!serial.match(numbers)) {
			error.numberError = serial;
		}
	}
	if (error.lengthError != null || error.numberError != null) {
		return error;
	}
	return null;
}

exports.apNameValidator = function(apName) {
	let pattern= /^[!-~]((?!\$\()[ -_a-~]){0,62}[!-~]$/;
	let error = {patternError:null};
	if (apName) {
		if (!apName.match(pattern)) {
			error.patternError = apName;
		}
	}
	if (error.patternError != null) {
		return error;
	}
	return null;
}

exports.apZoneValidator = function(apZoneName) {
	let pattern= /^[!-~]([ -~]){0,30}[!-~]$/;
	let error = {patternError:null};
	if (apZoneName) {
		if (!apZoneName.match(pattern)) {
			error.patternError = apZoneName;
		}
	}
	if (error.patternError != null) {
		return error;
	}
	return null;
}

exports.convertTimesatampToDate = function(timestamp) {
	var moment = require('moment');
	if(timestamp){
		var dateString = moment.unix(timestamp).format("MM-DD-YYYY-hh:mm:ss");	
	}else{
		dateString = '';
	}
	
	return dateString;
}