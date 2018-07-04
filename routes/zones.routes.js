var express = require('express');
var request = require("request");
var jsonfile = require('jsonfile');
var router = express.Router();
var app = express();
var logger = require("../config/logger.config");
var ZoneModel = require('../models/zones.json');
var ZoneModelFileName = './models/zones.json';
var CommonCluster = require('./CommonCluster');

//Get the list of AP_Zones from the controller /v6_0/rkszones
router.get('/rkszones', function(req, res) {	
	var CommonClusterObj = new CommonCluster("10.150.84.45");	
	promiseCall = CommonClusterObj.login();
	promiseCall.then(function (result) {
		return CommonClusterObj.getzones();
	})
	.then(function (result) {
		result = JSON.parse(result);
		res.json(result);
	})  
	.catch(function (reason) {
		res.json({
			success: false,
			message: "Error found : "+reason
		});
	});
});

module.exports = router;
