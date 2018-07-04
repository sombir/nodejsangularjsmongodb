var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var app = express();
var APIKeyModel = require('../models/APIKeyModel');
var logger = require("../config/logger.config");
app.set('superSecret', "xxxxxxxxxxxxxxxx");

const dbErrorMessage = 'Database access error, Please contact administrator or try again';

//middleware
router.use(function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
	// decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if (err) {
				APIKeyModel.findOne({key: token, status : 'Active'}, function (err, keyInfo) {
				  if(err){ 
						logger.info(dbErrorMessage);
						logger.error(err);
						return res.status(403).json({
							success: false,
							message: dbErrorMessage
						});
					}else if(keyInfo){
						//logger.info("API key authenticated")
						// if everything is good, save to request for use in other routes
						const decoded = {username : keyInfo.username}
						req.decoded = decoded;
						next();
					}else{
						logger.info("API key not found or not active")
						return res.status(403).json({
							success: false,
							message: 'Failed to authenticate token'
						});
					}
				});
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'Authentication failed, token not provided'
        });
    }
});

module.exports = router;
