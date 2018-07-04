var mongoose = require('mongoose');
var logger = require("../config/logger.config");
//var backprocess = require('../szcomm/backprocess');
var Q = require('q');
Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
var ruckus_db_uri = 'mongodb://ruckus:ruckus@localhost:27017/ruckus';

var options = {
    useMongoClient: true,
    autoIndex: false, // Don't build indexes
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 5, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0
};

mongoose.Promise = require('q').Promise;

var cpromise = mongoose.connect(ruckus_db_uri, options, function(error){
    if(error){
        logger.info("mongoose connection failed:"+error);
		process.exit();
    } else {
        logger.info("mongoose connection successful");
        //backprocess.startAll();
    }
});


cpromise.then(function(db){
	//db.collection('accesspoints').drop();
	//db.collection('clusters').drop();
	//db.collection('datacenters').drop();
	//db.collection('users').drop();
	mongoose.connection.db.listCollections().toArray(function (err, names) {
        logger.info(names);
        logger.info("promise method executed");
    })
});


require('../models/UserModel');
require('../models/AccessPointModel');
require('../models/ClusterModel');
require('../models/DataCenterModel');
require('../models/BackupHistoryModel');
require('../models/AuditTrailModel');
require('../models/APIKeyModel');
require('../models/TaskProgressModel');
//add other models here.
