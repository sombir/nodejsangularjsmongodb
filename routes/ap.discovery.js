var express = require('express');
var request = require("request");
var jsonfile = require('jsonfile');
var router = express.Router();
var app = express();
var logger = require("../config/discoverylogger.config");
var APModel = require('../models/AccessPointModel');
var ClusterModel = require('../models/ClusterModel');
var UserModel = require('../models/UserModel');
var CommonCluster = require('./CommonCluster');
var CommonService = require('./common.service');
var aputils = require('../utils/aputils');

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

//AP discovery API /wsg/ap/discovery/{AP_MAC}
router.put('/wsg/ap/discovery/:mac_address', function(req, res, next) { 
	logger.info("AP discovery API start from here")
	try{
		logger.info("AP discovery request payload : "+JSON.stringify(req.body));
		var mac_address = req.params.mac_address;
		var apIp = req.body.ip ? req.body.ip : ''
		var apsModel = req.body.model ? req.body.model : ''
		if(req.body && (req.body.mac == "" || req.body.mac == undefined)){
			logger.info("Mac Address is missing in the request")
			return res.json({
				success: false,
				message: 'Mac Address is missing in the request.'
			});
		}else if(req.body && (req.body.serial == "" || req.body.serial == undefined)){
			logger.info("Serial number is missing in the request")
			return res.json({
				success: false,
				message: 'Serial number is missing in the request.'
			});
		}else{
			var currentDate = new Date();
			
			APModel.findOne({ apserial: req.body.serial }, function(err, apFound) {
				if(err){
					logger.info(dbErrorMessage);
					logger.error(err);
					return res.json({
						success: false,
						message: dbErrorMessage
					});
				}else if(apFound){
					let apIp = req.body.ip ? req.body.ip : ''
					APModel.findOneAndUpdate({ apserial: req.body.serial }, { mac: mac_address, model: apsModel, ip: apIp,  last_modified : currentDate, last_contacted : currentDate}, function(err, updatedAP) {
						if(err){
							logger.info(dbErrorMessage);
							logger.error(err);
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else{
							return res.json({
								success: "200 OK"
							});
						}		
					});
				}else{
					UserModel.findOne({ username: 'admin' }, function(err, userInfo) {
						if(err){
							logger.info(dbErrorMessage);
							logger.error(err);
							return res.json({
								success: false,
								message: dbErrorMessage
							}); 
						}else if(userInfo && userInfo.allowunregisteredap){
							//check if default cluster is configured or not
							var APName = ""; 
							var clusterId = ""; 
							var clusterName = ""; 
							var zoneName = "";	
							var ApZoneId = "";	
							ClusterModel.findOne({ defaultcluster: true }, function(err, cluster) {
								if(err){
									logger.info(dbErrorMessage);
									logger.error(err);
									return res.json({
										success: false,
										message: dbErrorMessage
									}); 
								}else if(cluster){
									clusterId = cluster._id;
									clusterName = cluster.name;
									var CommonClusterObj = new CommonCluster(cluster.ip, cluster.loginid, cluster.password);	
									promiseCall = CommonClusterObj.login();
									promiseCall.then(function (result) {
										CommonClusterObj.GetAP(req.body.serial).then(function (result) {
											result = JSON.parse(result);
											let ApZoneId = "";
											let ApZoneName = "";
											ZoneList = cluster.zones;
											ZoneList.forEach(function(zone) {
												if(zone.id == result.zoneId){
													ApZoneId = zone.id;
													ApZoneName = zone.name;
												}
											});
											let cdsClusterState = aputils.getcdsclusterstate(result.connectionState, '', currentDate);
											let connObj = CommonClusterObj.connObj
											let clusterAPState = connObj.is35orLater() ? 'Offline' : 'Flagged';
											let apIp = result.ip ? result.ip : ''
											var newAP = new APModel({ apserial: req.body.serial, clusterid : clusterId, clustername : clusterName, mac: mac_address, apname: APName, model: result.model, ip: apIp, zonename: ApZoneName, zoneid: ApZoneId, connectionstate: result.connectionState, configmethod: "DEFAULT_PROVISIONED", cds_cluster_state: cdsClusterState, clusterapstate : clusterAPState, last_contacted : currentDate, username: "auto"});
											newAP.save(function (err) {
											  if (err){
												 logger.info(dbErrorMessage);
												 logger.error(err);
												 return res.json({
													success: false,
													message: dbErrorMessage
												 });
											  } else {
												 CommonService.populateNumberOfAPsPerCluster(clusterId, function(error, result){
													if(error){
														logger.info("Error found during ap discovery when populating number of ap after adding ap in default cluster")
														return res.json({
															success: true,
															message: "AP added successfully, but error while populating number of APs in cluster :"+result 
														});
													}else{
														return res.json({
															success: "200 OK"
														});
													}
												});
											  }								   
											});
										}).catch(function (reason) {
											logger.info("Default cluster configured, AP comes from the network & now adding AP in CDS with status ap not in cluster");
											var newAP = new APModel({ apserial: req.body.serial, clusterid : clusterId, clustername : clusterName, mac: mac_address, apname: APName, model: apsModel, ip: apIp, zonename: "", zoneid: "", connectionstate: "", configmethod: "DEFAULT_PROVISIONED", cds_cluster_state: "NOTINCLUSTER", last_contacted : currentDate, username: "auto"});
											newAP.save(function (err) {
											  if (err){
												 logger.info(dbErrorMessage);
												 logger.error(err);
												 return res.json({
													success: false,
													message: dbErrorMessage
												 });
											  } else {
												 CommonService.populateNumberOfAPsPerCluster(clusterId, function(error, result){
													if(error){
														logger.info("Error found during ap discovery when populating number of ap after adding ap in default cluster when AP not found in vSZ")
														return res.json({
															success: true,
															message: "AP added to default cluster successfully, but error while populating number of APs in cluster :"+result 
														});
													}else{
														return res.json({
															success: "200 OK"
														});
													}
												});
											  }								   
											});
										});
									})				
									.catch(function (reason) {
										if(reason == "Unreachable"){
											logger.info("Default cluster is not reachable")
											return res.json({
												success: false,
												message: "Default cluster is not reachable"
											});
										}else{
											logger.info("Error comes during ap discovery when adding ap in default cluster")
											return res.json({
												success: false,
												message: "Error : "+reason
											});
										}
									});						
								}else{
									logger.info("Default cluster not configured, AP comes from the network & adding as rejected in CDS  :"+req.body.serial);
									var newAP = new APModel({ apserial: req.body.serial, clusterid : "", clustername : "", mac: mac_address, apname: APName, model: apsModel, ip: apIp, zonename: "", zoneid: "", connectionstate: "", configmethod: "UNPROVISIONED", cds_cluster_state: "REJECTED", last_contacted : currentDate, username: "auto"});							
									newAP.save(function (err) {
									  if (err){
										 logger.info(dbErrorMessage);
										 logger.error(err);
										 return res.json({
											success: false,
											message: dbErrorMessage
										 });
									  } else {										 
										logger.info("Default cluster not configured, AP comes from the network & added as rejected in CDS")
										return res.json({
											success: true,
											message: "Default cluster not configured, AP comes from the network & added as rejected in CDS",
										});
									  }								   
									});	
								}
							});
						}else{
							logger.info("Allow Unregistered AP to join default cluster is disabled")
							return res.json({
								success: false,
								message: "Allow Unregistered AP to join default cluster is disabled" 
							});
						}
					});
				}
			});
			
		}
	} catch(e){
		logger.info("Exception occur during ap discovery : "+e)
		return res.json({
			success: false,
			message: "Exception occur during ap discovery: "+e
		});
	}
});

//AP state /wsg/ap/state/{AP_MAC}
router.get('/wsg/ap/state/:mac_address', function(req, res, next) {
	logger.info("AP state API start from here")
	try{
		var mac_address = req.params.mac_address;
		logger.info("AP state API request mac_address : "+mac_address);
		APModel.findOne({ mac: mac_address }, function(err, ap) {
			if(err){
				logger.info(dbErrorMessage);
				logger.error(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else if(ap && (ap.mac == mac_address)){
				if(ap.clusterid == '' || ap.clusterid == undefined){
					var responseData = {
								"ca": "-----BEGIN CERTIFICATE-----\nMIIEtzCCA5+gAwIBAgIJAL4okv6JYppxMA0GCSqGSIb3DQEBBQUAMIGYMQswCQYD\nVQQGEwJVUzELMAkGA1UECBMCQ0ExEjAQBgNVBAcTCVN1bm55dmFsZTEdMBsGA1UE\nChMUUnVja3VzIFdpcmVsZXNzIEluYy4xKTAnBgkqhkiG9w0BCQEWGnNlcnZpY2VA\ncnVja3Vzd2lyZWxlc3MuY29tMR4wHAYDVQQDExVDZXJ0aWZpY2F0ZSBBdXRob3Jp\ndHkwHhcNMTcwOTA2MDQ0ODQ0WhcNMzIwOTAyMDQ0ODQ0WjCBmDELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgTAkNBMRIwEAYDVQQHEwlTdW5ueXZhbGUxHTAbBgNVBAoTFFJ1\nY2t1cyBXaXJlbGVzcyBJbmMuMSkwJwYJKoZIhvcNAQkBFhpzZXJ2aWNlQHJ1Y2t1\nc3dpcmVsZXNzLmNvbTEeMBwGA1UEAxMVQ2VydGlmaWNhdGUgQXV0aG9yaXR5MIIB\nIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsbTYkkNBE+EPXg/w6J7pTfmk\ny4r/Kqd0uTvvsWYL3oxvDawNmHViBC3/jkFduhJmK6MIsWLUBB0J/5fbI+HK/Bin\nJJVL0eZyPxRhtBXT/vk2mbV8JLsf3ZV5/cqS9dkWmTAVEGrLuiF4N4pcVa5+6Nv7\nujEFScAh80Q0fYB6QK3jYMeTEDoT7T500BshzH3S1Pyfnmi8/kz+rDasmp3tiJU6\nxB2G7GkkSEigTd6WhzudZ/M6wVUlnrIrJB+Yv0hMxZhwon+E0aI+Ln6jl3nHg65X\nRubNRCUhymMAwyiRiLhVV+nGfDu90FNy6Ol8K4mHiO9Nsb9iyhXvcQRC0OrBDQID\nAQABo4IBADCB/TAdBgNVHQ4EFgQUzgqc5tjnY4Mk0JRQr9y7W2t9Bg8wgc0GA1Ud\nIwSBxTCBwoAUzgqc5tjnY4Mk0JRQr9y7W2t9Bg+hgZ6kgZswgZgxCzAJBgNVBAYT\nAlVTMQswCQYDVQQIEwJDQTESMBAGA1UEBxMJU3Vubnl2YWxlMR0wGwYDVQQKExRS\ndWNrdXMgV2lyZWxlc3MgSW5jLjEpMCcGCSqGSIb3DQEJARYac2VydmljZUBydWNr\ndXN3aXJlbGVzcy5jb20xHjAcBgNVBAMTFUNlcnRpZmljYXRlIEF1dGhvcml0eYIJ\nAL4okv6JYppxMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBACicS1+b\ndl0SJ8qmYrcylqWJWhtqg1Ytob0zadK3UVeIRae/Nm6SY4CEO2pgwxoM6SGHQSGc\nodQ7+/exVHTLEBcILC+7dTPgbYCFWtExZ870SQ5wos9hIZUezK12dLsPSZlGI5tC\n1WRpWq6u9QxxYYvJZs3Tc+0n8muyx8BpSnHGl0b00lr60JSzUtOqcVoJ7j1DrSik\n4mKfbEqhnXFutPliLCn4iOS4uyZwpSGjhR94GdJgYUc7AGuAMKbUQ9rvRoZFAPdh\n9rMz11pBlFQq9b0fQZpAv0X4brSIW52IESNidKp1y3N96R9GzjW9vdV4jRBn0cmc\n1GA/3K34kvAsLYs=\n-----END CERTIFICATE-----\n",
								"cert": "-----BEGIN CERTIFICATE-----\nMIIDbDCCAlSgAwIBAgIGAV8CUdR7MA0GCSqGSIb3DQEBBAUAMIGYMQswCQYDVQQG\nEwJVUzELMAkGA1UECAwCQ0ExEjAQBgNVBAcMCVN1bm55dmFsZTEdMBsGA1UECgwU\nUnVja3VzIFdpcmVsZXNzIEluYy4xKTAnBgkqhkiG9w0BCQEWGnNlcnZpY2VAcnVj\na3Vzd2lyZWxlc3MuY29tMR4wHAYDVQQDDBVDZXJ0aWZpY2F0ZSBBdXRob3JpdHkw\nHhcNMTcxMDA5MTgwNzE4WhcNMTgxMDA5MTgwNzE4WjCBlDELMAkGA1UEBhMCVVMx\nCzAJBgNVBAgMAkNBMRIwEAYDVQQHDAlTdW5ueXZhbGUxHTAbBgNVBAoMFFJ1Y2t1\ncyBXaXJlbGVzcyBJbmMuMSkwJwYJKoZIhvcNAQkBFhpzZXJ2aWNlQHJ1Y2t1c3dp\ncmVsZXNzLmNvbTEaMBgGA1UEAwwRRUM6OEM6QTI6MTQ6NjM6RTAwgZ8wDQYJKoZI\nhvcNAQEBBQADgY0AMIGJAoGBAKI/Mq+XzA4G3GiDFl3jLBTLE+arApINlhmNXnhv\nkAcAQjSH6Ss0vHJbuMP2V+tMjU+/hYRLwhTFbLiRpAR2gQBL4/IMMluhtiUenk7U\nP6oRLpaRKyOTzsigDo9fNlVNgY0rKFlljMcPkkomQu6ilUXmw9H1mHCFhzh++wfd\n9+qZAgMBAAGjQjBAMB8GA1UdIwQYMBaAFM4KnObY52ODJNCUUK/cu1trfQYPMB0G\nA1UdDgQWBBTylDQuqPFcsDPQwZkwrOnB0NZGcTANBgkqhkiG9w0BAQQFAAOCAQEA\nVXDJ5O8UKLcHY8NjI2wDQu6QNvj+xPE64h2l64YjLH5uGpPWLzeCvh0axx00AN/D\npsLhxE+JUxZ6syzm239EfeTiCXa8VQ209jeu7gad48iDZPh4RJCDI1BdwThzyMfo\ncIU0aZhxMeKPCloCAyAhMKp/F5H0r1um5FzM5+23TW4HUJvSUeB9ntMDxu0aizrK\naEUxru4urDr9CUKBHfVObUvPSBoXQcGPkNIacV2HhyeAFlXOZzcy4nOj8biP+46D\nUP84NFUYa9k9wxvzYarGzrvxN8AWQXGwVkT3PPdIp3FcofLabGB+XQja/1/r//sC\nFTl5iSHU9/Vk4I88t3twCA==\n-----END CERTIFICATE-----\n",
								"key": "-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQCiPzKvl8wOBtxogxZd4ywUyxPmqwKSDZYZjV54b5AHAEI0h+kr\nNLxyW7jD9lfrTI1Pv4WES8IUxWy4kaQEdoEAS+PyDDJbobYlHp5O1D+qES6WkSsj\nk87IoA6PXzZVTYGNKyhZZYzHD5JKJkLuopVF5sPR9ZhwhYc4fvsH3ffqmQIDAQAB\nAoGAJUsRg3sI1FCPaRZ4lawZ/c2QDX1RYfDth4IPLO+302Qj059J4TyF9GNQ3PpK\nyzMVaDdFoVsoiU2359TSNpRmoiSfvQNWsyb0MupOy5JumCOjMgJu8jlr02hKFIK8\nsPD76RkYWVRdirECFs7nAxsqELGFgb+a6t3Utp4/i5KuzGECQQDh3nlo1VkwSToL\n7Z7TX4xEZcQA9K4Xz8ECwUc906++KqL6iF90qU99AUDRwfQcpN4aQofYlc+2F6UH\nXQpQVWxTAkEAt+P/uTBOexbT/IAwL74VmtU796gsMwW+zz1LLOvC1FJBy3N6eP83\nsvpnQceBFHdXbGqqatUKtIY0YrYov6AP4wJBAOEUbjBFyucPUcTpOkixAnp2XugE\n7CfWZCR2rqOx+4OpwVef5l+/CPMs+IcOnFCfCqVofy8Zuy9eSJoZ4VlEhvkCQFrs\n5KQX66ZXOkhuxeTFc39Ukks5n2k3HQrxvrsec/5yEdBccCFl6I+Z2vaehAevns2f\nzFX4s0th1IM+mNVveosCQDXRVCF0j01yySJrCLYv9VJywX3GOMb/MH7RpvjKpg1G\nOnvF8y+66bMBi0mMSxWyrpQnN+FGb0hzG3bfyjKdIEg=\n-----END RSA PRIVATE KEY-----\n",
								"priWSGUrl": "/wsg/ap/state/"+mac_address,
								"sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDBmc8JbxMEJNGEkiqT4VZq4B8Uua9XLiDc3ZmT8tSbBOGw61LiUFCPz5ZxNKc2/PDbqiIGv73GINgSGCx0E050CWdx/c5T9Fx/mfpkY4gUhG5foGryfmfa6f4TXYVyJNyycaiFRR8E9PaSQc+SqBczAmonoCe39oXMKNJUUFzCd9uMGnvCYMs7xKUgrDpAm+ZlHVnlZPap+3vspAYw0Qg38tgrNsPGEokmY2KNAtrdX51lC0tfCDNOIqt/8OdswallWn+xIdu+vTxmcDb14XBVZeerqbqy6xEv5MKNekYaJWy/SyV7SMoZBf7iQo+Nnmpz7x+wAboQv9p0AbcOA+zl",
								"state": 1,
								"wsgServerList": ""
								}
								logger.info(responseData);
							return res.json(responseData);
				}else{
				
					ClusterModel.findOne({ _id: ap.clusterid }, function(err, cluster) {
						if(err){
							logger.info(dbErrorMessage);
							logger.error(err);
							return res.json({
								success: false,
								message: dbErrorMessage
							});
						}else if(cluster && (cluster._id == ap.clusterid)){
							var responseData = {
								"ca": "-----BEGIN CERTIFICATE-----\nMIIEtzCCA5+gAwIBAgIJAL4okv6JYppxMA0GCSqGSIb3DQEBBQUAMIGYMQswCQYD\nVQQGEwJVUzELMAkGA1UECBMCQ0ExEjAQBgNVBAcTCVN1bm55dmFsZTEdMBsGA1UE\nChMUUnVja3VzIFdpcmVsZXNzIEluYy4xKTAnBgkqhkiG9w0BCQEWGnNlcnZpY2VA\ncnVja3Vzd2lyZWxlc3MuY29tMR4wHAYDVQQDExVDZXJ0aWZpY2F0ZSBBdXRob3Jp\ndHkwHhcNMTcwOTA2MDQ0ODQ0WhcNMzIwOTAyMDQ0ODQ0WjCBmDELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgTAkNBMRIwEAYDVQQHEwlTdW5ueXZhbGUxHTAbBgNVBAoTFFJ1\nY2t1cyBXaXJlbGVzcyBJbmMuMSkwJwYJKoZIhvcNAQkBFhpzZXJ2aWNlQHJ1Y2t1\nc3dpcmVsZXNzLmNvbTEeMBwGA1UEAxMVQ2VydGlmaWNhdGUgQXV0aG9yaXR5MIIB\nIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsbTYkkNBE+EPXg/w6J7pTfmk\ny4r/Kqd0uTvvsWYL3oxvDawNmHViBC3/jkFduhJmK6MIsWLUBB0J/5fbI+HK/Bin\nJJVL0eZyPxRhtBXT/vk2mbV8JLsf3ZV5/cqS9dkWmTAVEGrLuiF4N4pcVa5+6Nv7\nujEFScAh80Q0fYB6QK3jYMeTEDoT7T500BshzH3S1Pyfnmi8/kz+rDasmp3tiJU6\nxB2G7GkkSEigTd6WhzudZ/M6wVUlnrIrJB+Yv0hMxZhwon+E0aI+Ln6jl3nHg65X\nRubNRCUhymMAwyiRiLhVV+nGfDu90FNy6Ol8K4mHiO9Nsb9iyhXvcQRC0OrBDQID\nAQABo4IBADCB/TAdBgNVHQ4EFgQUzgqc5tjnY4Mk0JRQr9y7W2t9Bg8wgc0GA1Ud\nIwSBxTCBwoAUzgqc5tjnY4Mk0JRQr9y7W2t9Bg+hgZ6kgZswgZgxCzAJBgNVBAYT\nAlVTMQswCQYDVQQIEwJDQTESMBAGA1UEBxMJU3Vubnl2YWxlMR0wGwYDVQQKExRS\ndWNrdXMgV2lyZWxlc3MgSW5jLjEpMCcGCSqGSIb3DQEJARYac2VydmljZUBydWNr\ndXN3aXJlbGVzcy5jb20xHjAcBgNVBAMTFUNlcnRpZmljYXRlIEF1dGhvcml0eYIJ\nAL4okv6JYppxMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBACicS1+b\ndl0SJ8qmYrcylqWJWhtqg1Ytob0zadK3UVeIRae/Nm6SY4CEO2pgwxoM6SGHQSGc\nodQ7+/exVHTLEBcILC+7dTPgbYCFWtExZ870SQ5wos9hIZUezK12dLsPSZlGI5tC\n1WRpWq6u9QxxYYvJZs3Tc+0n8muyx8BpSnHGl0b00lr60JSzUtOqcVoJ7j1DrSik\n4mKfbEqhnXFutPliLCn4iOS4uyZwpSGjhR94GdJgYUc7AGuAMKbUQ9rvRoZFAPdh\n9rMz11pBlFQq9b0fQZpAv0X4brSIW52IESNidKp1y3N96R9GzjW9vdV4jRBn0cmc\n1GA/3K34kvAsLYs=\n-----END CERTIFICATE-----\n",
								"cert": "-----BEGIN CERTIFICATE-----\nMIIDbDCCAlSgAwIBAgIGAV8CUdR7MA0GCSqGSIb3DQEBBAUAMIGYMQswCQYDVQQG\nEwJVUzELMAkGA1UECAwCQ0ExEjAQBgNVBAcMCVN1bm55dmFsZTEdMBsGA1UECgwU\nUnVja3VzIFdpcmVsZXNzIEluYy4xKTAnBgkqhkiG9w0BCQEWGnNlcnZpY2VAcnVj\na3Vzd2lyZWxlc3MuY29tMR4wHAYDVQQDDBVDZXJ0aWZpY2F0ZSBBdXRob3JpdHkw\nHhcNMTcxMDA5MTgwNzE4WhcNMTgxMDA5MTgwNzE4WjCBlDELMAkGA1UEBhMCVVMx\nCzAJBgNVBAgMAkNBMRIwEAYDVQQHDAlTdW5ueXZhbGUxHTAbBgNVBAoMFFJ1Y2t1\ncyBXaXJlbGVzcyBJbmMuMSkwJwYJKoZIhvcNAQkBFhpzZXJ2aWNlQHJ1Y2t1c3dp\ncmVsZXNzLmNvbTEaMBgGA1UEAwwRRUM6OEM6QTI6MTQ6NjM6RTAwgZ8wDQYJKoZI\nhvcNAQEBBQADgY0AMIGJAoGBAKI/Mq+XzA4G3GiDFl3jLBTLE+arApINlhmNXnhv\nkAcAQjSH6Ss0vHJbuMP2V+tMjU+/hYRLwhTFbLiRpAR2gQBL4/IMMluhtiUenk7U\nP6oRLpaRKyOTzsigDo9fNlVNgY0rKFlljMcPkkomQu6ilUXmw9H1mHCFhzh++wfd\n9+qZAgMBAAGjQjBAMB8GA1UdIwQYMBaAFM4KnObY52ODJNCUUK/cu1trfQYPMB0G\nA1UdDgQWBBTylDQuqPFcsDPQwZkwrOnB0NZGcTANBgkqhkiG9w0BAQQFAAOCAQEA\nVXDJ5O8UKLcHY8NjI2wDQu6QNvj+xPE64h2l64YjLH5uGpPWLzeCvh0axx00AN/D\npsLhxE+JUxZ6syzm239EfeTiCXa8VQ209jeu7gad48iDZPh4RJCDI1BdwThzyMfo\ncIU0aZhxMeKPCloCAyAhMKp/F5H0r1um5FzM5+23TW4HUJvSUeB9ntMDxu0aizrK\naEUxru4urDr9CUKBHfVObUvPSBoXQcGPkNIacV2HhyeAFlXOZzcy4nOj8biP+46D\nUP84NFUYa9k9wxvzYarGzrvxN8AWQXGwVkT3PPdIp3FcofLabGB+XQja/1/r//sC\nFTl5iSHU9/Vk4I88t3twCA==\n-----END CERTIFICATE-----\n",
								"key": "-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQCiPzKvl8wOBtxogxZd4ywUyxPmqwKSDZYZjV54b5AHAEI0h+kr\nNLxyW7jD9lfrTI1Pv4WES8IUxWy4kaQEdoEAS+PyDDJbobYlHp5O1D+qES6WkSsj\nk87IoA6PXzZVTYGNKyhZZYzHD5JKJkLuopVF5sPR9ZhwhYc4fvsH3ffqmQIDAQAB\nAoGAJUsRg3sI1FCPaRZ4lawZ/c2QDX1RYfDth4IPLO+302Qj059J4TyF9GNQ3PpK\nyzMVaDdFoVsoiU2359TSNpRmoiSfvQNWsyb0MupOy5JumCOjMgJu8jlr02hKFIK8\nsPD76RkYWVRdirECFs7nAxsqELGFgb+a6t3Utp4/i5KuzGECQQDh3nlo1VkwSToL\n7Z7TX4xEZcQA9K4Xz8ECwUc906++KqL6iF90qU99AUDRwfQcpN4aQofYlc+2F6UH\nXQpQVWxTAkEAt+P/uTBOexbT/IAwL74VmtU796gsMwW+zz1LLOvC1FJBy3N6eP83\nsvpnQceBFHdXbGqqatUKtIY0YrYov6AP4wJBAOEUbjBFyucPUcTpOkixAnp2XugE\n7CfWZCR2rqOx+4OpwVef5l+/CPMs+IcOnFCfCqVofy8Zuy9eSJoZ4VlEhvkCQFrs\n5KQX66ZXOkhuxeTFc39Ukks5n2k3HQrxvrsec/5yEdBccCFl6I+Z2vaehAevns2f\nzFX4s0th1IM+mNVveosCQDXRVCF0j01yySJrCLYv9VJywX3GOMb/MH7RpvjKpg1G\nOnvF8y+66bMBi0mMSxWyrpQnN+FGb0hzG3bfyjKdIEg=\n-----END RSA PRIVATE KEY-----\n",
								"priWSGUrl": "/wsg/ap/state/"+mac_address,
								"sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDBmc8JbxMEJNGEkiqT4VZq4B8Uua9XLiDc3ZmT8tSbBOGw61LiUFCPz5ZxNKc2/PDbqiIGv73GINgSGCx0E050CWdx/c5T9Fx/mfpkY4gUhG5foGryfmfa6f4TXYVyJNyycaiFRR8E9PaSQc+SqBczAmonoCe39oXMKNJUUFzCd9uMGnvCYMs7xKUgrDpAm+ZlHVnlZPap+3vspAYw0Qg38tgrNsPGEokmY2KNAtrdX51lC0tfCDNOIqt/8OdswallWn+xIdu+vTxmcDb14XBVZeerqbqy6xEv5MKNekYaJWy/SyV7SMoZBf7iQo+Nnmpz7x+wAboQv9p0AbcOA+zl",
								"state": 1,
								"wsgServerList": cluster.controllerips.join(',')
								}
								logger.info(responseData);
							return res.json(responseData);
						}else{
							logger.info("Error comes during AP state API when searching cluster : cluster IP not found");
							res.json({
								success: false,
								message: 'Cluster IP not found.'
							});
						}
					});		
				}				
			}else{
				logger.info("Error comes during AP state API when searching AP mac : AP not found");
				res.json({
					success: false,
					message: 'AP not found'
				});
			}
		});
	} catch(e){
		logger.info("Exception comes during AP state API :"+e);
		return res.json({
			success: false,
			message: "Exception comes during AP state API : "+e
		});
	}
});

module.exports = router;
