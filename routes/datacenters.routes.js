var express = require('express');
var router = express.Router();
var request = require("request");
var jsonfile = require('jsonfile');
var logger = require("../config/logger.config");
var dataCenterModel = require('../models/datacenters.json');
var app = express();
var dataCenterModelFileName = './models/datacenters.json';

//get single data center details api /getDataCenter/:Name
router.get('/getDataCenter/:Name', function(req, res, next) {
	logger.info('Get single data center details code start here');	
	var dataCenterName = req.params.Name;
	var machingDataCenter = "";
	if(req.params.Name == ""){
		return res.json({
			success: false,
			message: 'Data center name can not be empty.'
		});
	}else{
		var loopStop = false;
		dataCenterModel.forEach(function(dataCenter) {
			if(dataCenter.Name == dataCenterName){
				machingDataCenter = dataCenter;
				loopStop = true;
			}
		});
		if(!loopStop){
			return res.json({
				success: false,
				message: 'Data center not found.'
			});
		}else{
			return res.json({
				success: true,
				data: machingDataCenter
			});
		}
	}
});

//get list of data centers api /getDataCenters
router.get('/getDataCenters', function(req, res, next) {
	logger.info('data centers code start here');	
	return res.json({
		success: true,
        data: dataCenterModel
	});
});

//create new data center api /createDataCenter
router.post('/createDataCenter', function(req, res, next) {
	logger.info('Create data centers code start here');	
	var newDatacenter = {};
	var datacenterExists = false;
	var defaultValue = "False";	
	if(req.body.Default === "True" || req.body.Default === "true" || req.body.Default == true){
		defaultValue = "True";
	}
	if(req.body && (req.body.Name == "" || req.body.Name == undefined)){
		return res.json({
			success: false,
			message: 'Data center name can not be empty.'
		});
	}else{
		dataCenterModel.forEach(function(dataCenter) {
			if(dataCenter.Name == req.body.Name){
				datacenterExists = true;
			}
		});
		if(datacenterExists){
			return res.json({
				success: false,
				message: 'Data center already exists.'
			});
		}else{
			newDatacenter = {"Name":req.body.Name, "Default":defaultValue};
		    dataCenterModel.push( newDatacenter );
		    jsonfile.writeFile(dataCenterModelFileName, dataCenterModel, function (err) {
			  if (err){
				 return res.json({
					success: false,
					message: err
				 }); 
			  }else{				  
				  return res.status(201).json({
					success: false,
					message: 'Data center created successfully.'
				  });
			  }
			});
		}
	}
});

//update data center api /updateDatacenter/:Name
router.put('/updateDatacenter/:Name', function(req, res, next) {
	logger.info('Update data center code start here');	
	var loopStop = false;
	var defaultValue = "False";	
	if(req.body && (req.body.Name == "" || req.body.Name == undefined)){
		return res.json({
			success: false,
			message: 'Data center name can not be empty.'
		});
	}else{
		dataCenterModel.forEach(function(dataCenter) {
			if(dataCenter.Name == req.params.Name){
				dataCenter.Name = req.body.Name;
				if(req.body.Default === "True" || req.body.Default === "true" || req.body.Default == true){
					dataCenter.Default = "True";
				}				
				loopStop = true;
			}
		});
		if(!loopStop){
			return res.json({
				success: false,
				message: 'Data center not found.'
			});
		}else{
			jsonfile.writeFile(dataCenterModelFileName, dataCenterModel, function (err) {
			  if (err){
				 return res.json({
					success: false,
					message: err
				 }); 
			  }else{
				  return res.json({
					success: false,
					message: 'Data center updated successfully.'
				  });
			  }
			});
		}
	}
});

//delete data center api /deleteDatacenter/:Name
router.delete('/deleteDatacenter/:Name', function(req, res, next) {
	logger.info('Delete data center code start here');	
	var loopStop = false;
	if(req.body && req.params.Name == ""){
		return res.json({
			success: false,
			message: 'Data center name can not be empty.'
		});
	}else{
		for (var i = 0; i < dataCenterModel.length; i++) {
			if (dataCenterModel[i].Name === req.params.Name) {
				loopStop = true;
				dataCenterModel.splice(i, 1);
				break;
			}
		}
		if(!loopStop){
			return res.json({
				success: false,
				message: 'Data center not found.'
			});
		}else{
			jsonfile.writeFile(dataCenterModelFileName, dataCenterModel, function (err) {
			  if (err){
				 return res.json({
					success: false,
					message: err
				 }); 
			  }else{
				  return res.json({
					success: false,
					message: 'Data center deleted successfully.'
				  });
			  }
			});
		}
	}
});

module.exports = router;
