var express = require('express');
var router = express.Router();
var logger = require("../config/logger.config");
var AuditTrailModel = require('../models/AuditTrailModel');
var aputils = require('../utils/aputils');
var app = express();

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

//get list of admin activities
router.get('/adminactivitieslist', function(req, res, next) {
	logger.info("Get list of admin activities API start from here");
	try{
		if(!req.query.startindex){
			var startindex = 0;
		}else{
			var startindex = req.query.startindex;
		}
		if(!req.query.numberofrows){
			var numberofrows = 0;
		}else{
			var numberofrows = parseInt(req.query.numberofrows);
		}
		if(!req.query.sortby){			
			var sortByColumn = 'activitytime';
		}else{
			var sortByColumn = req.query.sortby;
		}
		if(!req.query.sortorder){			
			var sortOrder = -1;
		}else{
			if(req.query.sortorder != 1 && req.query.sortorder != -1){
				var sortOrder = -1;
			}else{
				var sortOrder = req.query.sortorder;
			}
		}
		var sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if(!req.query.search){
			var searchText = "";
		}else{
			var searchText = req.query.search;
		}
		logger.info("searchText : "+searchText);
		
		var output = '{"totalCount":0,"hasMore":false,"list":[]}';
		output = JSON.parse(output);
		
		var searchTextRegExp = new RegExp(searchText,'i');
		
		//build count query
		var queryCount = AuditTrailModel.count({ $or: [ {sourceip: searchTextRegExp}, {action: searchTextRegExp}, {resource: searchTextRegExp}, {description: searchTextRegExp}, {username: searchTextRegExp} ]});
		
		//build filter query
		var queryFilter = AuditTrailModel.find({ $or: [ {sourceip: searchTextRegExp}, {action: searchTextRegExp}, {resource: searchTextRegExp}, {description: searchTextRegExp}, {username: searchTextRegExp}]}).sort(sortString).skip(startindex > 0 ? ((startindex-1)*numberofrows) : 0).limit(numberofrows);
		
		//Query to find total using filter if any
		queryCount.exec(function (err, activitiesCount) {
		  if(err){
			  	logger.info(dbErrorMessage);
				logger.error(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{			
				output.totalCount = activitiesCount;				
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, activities) {
					if(err){
						logger.info(dbErrorMessage);
						logger.error(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var previousCount = startindex != 0 ? (startindex-1)*numberofrows : 0;		
						var allRows = activities.length + previousCount;
						if(output.totalCount > allRows){
							output.hasMore = true;	
						}
						output.list = activities;
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of admin activities executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of admin activities Exception: "+e
		});
	}
});

//get list of admin activities
router.post('/adminactivitieslistpost', function(req, res, next) {
	logger.info("Get list of admin activities API start from here");
	var startindex, numberofrows, sortByColumn, sortColumnID, sortorder, sortColumnBy, sortString, searchText, searchTextRegExp, output, sortString, queryCount, queryFilter;
	var requestPayload = req.body;
	try{
		if(!req.query.managedby){
			var managedbyStr = "";
		}else{
			var managedbyStr = req.query.managedby;
		}
		if (requestPayload.start !=0) {
			startindex = requestPayload.start;
		} else {
			startindex = 0;
		}
		if (requestPayload.length != 0) {
			numberofrows = requestPayload.length;
		} else {
			numberofrows = 0;
		}
		if (requestPayload.order[0].column >= 0) {
			sortColumnID = requestPayload.order[0].column;
			sortByColumn = requestPayload.columns[sortColumnID].data;
		} else {
			sortByColumn = requestPayload.columns[0].data;
		}
		sortColumnBy = requestPayload.order[0].dir;
		if (sortColumnBy == 'asc') {
			sortOrder = 1;
		} else if (sortColumnBy == 'desc') {
			sortOrder = -1;
		}
		sortString = '{"'+sortByColumn+'":'+sortOrder+'}';
		sortString = JSON.parse(sortString);
		if (requestPayload.search.value != "") {
			searchText = requestPayload.search.value;
		} else {
			searchText = "";
		}
		output = '{"recordsTotal":0,"recordsFiltered":0,"draw":0,"data":[]}';
		output = JSON.parse(output);
		
		searchTextRegExp = new RegExp(searchText,'i');
		
		if(managedbyStr){
			//build count query
			queryCount = AuditTrailModel.count({$and: [{ $or: [ {sourceip: searchTextRegExp}, {action: searchTextRegExp}, {resource: searchTextRegExp}, {description: searchTextRegExp}, {username: searchTextRegExp} ]},{managedby: managedbyStr}]});
			//build filter query
			queryFilter = AuditTrailModel.find({$and: [{ $or: [ {sourceip: searchTextRegExp}, {action: searchTextRegExp}, {resource: searchTextRegExp}, {description: searchTextRegExp}, {username: searchTextRegExp} ]},{managedby: managedbyStr}]}).sort(sortString).skip(startindex).limit(numberofrows);
		}else{
			//build count query
			queryCount = AuditTrailModel.count({ $or: [ {sourceip: searchTextRegExp}, {action: searchTextRegExp}, {resource: searchTextRegExp}, {description: searchTextRegExp}, {username: searchTextRegExp} ]});
			//build filter query
			queryFilter = AuditTrailModel.find({ $or: [ {sourceip: searchTextRegExp}, {action: searchTextRegExp}, {resource: searchTextRegExp}, {description: searchTextRegExp}, {username: searchTextRegExp}  ]}).sort(sortString).skip(startindex).limit(numberofrows);
		}
		//Query to find total using filter if any
		queryCount.exec(function (err, APCount) {
			if(err){
				logger.info(dbErrorMessage);
				logger.error(err);
				return res.json({
					success: false,
					message: dbErrorMessage
				});
			}else{			
				output.recordsFiltered = APCount;
				output.recordsTotal = APCount;	
				output.draw = req.body.draw;		
				//Query to find filtered result with pagination options
				queryFilter.exec(function (err, APs) {
					if(err){
						logger.info(dbErrorMessage);
						logger.error(err);
						return res.json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						output.data = APs;
												
						return res.json(output);
					}
				});
			}
		});
	} catch(e){
		logger.info("get list of admin activities executed catch : "+e);
		return res.json({
			success: false,
			message: "Get list of admin activities Exception: "+e
		});
	}
});

module.exports = router;
