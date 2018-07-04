var express = require('express');
var request = require("request");
var jsonfile = require('jsonfile');
var router = express.Router();
var logger = require("../config/logger.config");
var CommonService = require('./common.service');
var aputils = require('../utils/aputils');
var User = require('../models/UserModel');
var jwt = require('jsonwebtoken');
var app = express();
var apModelFileName = './models/aps.json';
app.set('superSecret', "xxxxxxxxxxxxxxxx");

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

//get list of users /api/login
router.post('/login', function(req, res) {
    logger.info("Login API start from here")
	var username = req.body.username;
    var password = req.body.password;
    var isUserFound = false;
    var foundUser = {};
    User.findOne({ username: req.body.username }, function(err, users) {
	  if(err){ 
			logger.info(dbErrorMessage);
			logger.error(err);
			return res.status(401).json({
				success: false,
				message: dbErrorMessage
			});
		}else{
			if(!users){
				logger.info("Login : Authentication failed. username ["+req.body.username+"] not found in cds")
				return res.status(401).json({
					success: false,
					message: 'Authentication failed. user not found.'
				});
			}else if (users.password == req.body.password) {
				var currentDate = new Date();
				User.findOneAndUpdate({ username: users.username }, { lastlogin: currentDate }, function(err, updatedUser) {
					if(err){
						logger.info(dbErrorMessage);
						logger.error(err);
						return res.status(401).json({
							success: false,
							message: dbErrorMessage
						});
					}else{
						var payload = {'userId':users._id, 'username':users.username, 'password':users.password};
						var token = jwt.sign(payload, app.get('superSecret'), {
								expiresIn: 7200 //we are setting the expiration time of 2 hour. 
							});
						var sourceip = aputils.getClientIp(req);
						var action = "Logon"
						var resource = "Administrator"
						var username = payload.username
						var description = resource+' ['+username+'] logged on from ['+sourceip+'].';
						const data = {"sourceip" : sourceip, "action" : action, "resource" : resource, "description" : description, "username" : username}
						CommonService.createAuditLog(data)
						logger.info("Login : Username ["+req.body.username+"] authenticated successfully")
						return res.json({
							success: true,
							message: 'Authentication success!',
							token: token
						});
					}
				});				
			} else {
				logger.info('Login : Authentication failed. Wrong password: ');
				return res.status(401).json({
					success: false,
					message: 'Authentication failed. Wrong password.'
				});
			}
			
		}
	});
    
});

module.exports = router;
