var querystring = require('querystring');
var http = require('http');
var https = require('https');


var baseURL = 'http://localhost';


var putDiscovery = function(apSerial,mac){
	console.log('apSerial : ' + apSerial);
	console.log('mac : ' + mac);
	var url = '/wsg/ap/discovery/'+mac;
	var data = {
		"countryCode": "US",
		"devSupportUsb": "1",
		"deviceIpMode": 1,
		"deviceName": "RuckusAP-Colin",
		"fwVersion": "3.5.0.8.109",
		"gpsInfo": "",
		"ip": "172.16.112.182",
		"location": "",
		"mac": mac,
		"meshRole": 0,
		"model": "R510",
		"protocolVersion": "0.50",
		"provisionTag": "",
		"radio": [
      [
      {
        "channel": "1,2,3,4,5,6,7,8,9,10,11"
     }
     ],
     [
     {
        "channel": "36,40,44,48,149,153,157,161"
     }
     ]
     ],
     "serial": apSerial,
     "timeStamp": "1512016140"
  };

  const postData = querystring.stringify(data);
  console.log(postData);
	// var queryString = $.param(data);
	var options = {
		host: 'localhost',
		port: 3000,
		path: url,
		method: 'PUT',
		// timeout : 2000,
		// json:data
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
	};

	http.request(options, function(res) {
		console.log('PUT '+ mac +' STATUS: ' + res.statusCode);
		console.log('PUT '+ mac +' HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('PUT '+ mac +' BODY: ' + chunk);
			getDiscover(mac);

		});
	}).write(postData);
};

var getDiscover = function(mac){
	var url = '/wsg/ap/state/'+mac;
	console.log('mac : ' + mac);
	var options = {
		host: 'localhost',
		port: 3000,
		path: url,
		method: 'GET'
		// timeout : 3000
	};

	http.request(options, function(res) {
		console.log('GET '+ mac +' STATUS: ' + res.statusCode);
		console.log('GET '+ mac +' HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('GET '+ mac +' BODY: ' + chunk);
		});
	}).end();
}

var main = function(apArray){
	for (var i = 0; i < apArray.length; i++) {
		(function(ind) {
       setTimeout(function(ap){
         putDiscovery(ap.apSerial,ap.mac);
         console.log('ap.apSerial : ' + ap.apSerial);
         console.log('ap.mac : ' + ap.mac);
      }, 1000 + (10 * ind), apArray[i]);
   })(i);
}
};

var createAPArray = function(){
   var numberofAP = 1000;
   var apArray = [];
   while(apArray.length < numberofAP){
      var randomnumber = Math.floor(Math.random()*999999999999) + 1;
      var newAP = {apSerial:'', mac:''};
      if(apArray.indexOf(randomnumber) > -1) continue;
      newAP.apSerial = randomnumber;
      var finalMac='';
      for (var i = 0; i < 6; i++) {
         if (i==5) {
           finalMac=finalMac.concat((Math.floor(Math.random()*999) + 1).toString());
        } else {
           finalMac=finalMac.concat((Math.floor(Math.random()*999) + 1).toString().concat(':'));
        }
     }
     newAP.mac = finalMac;
     apArray.push(newAP);
     if (apArray.length==numberofAP) {
      console.log(apArray);
      main(apArray);
   }
}
};

createAPArray();