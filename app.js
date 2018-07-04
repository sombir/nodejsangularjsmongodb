var express = require('express');
var app = express();
var router = express.Router();
var path = require('path');
var cron = require('node-schedule');
var favicon = require('serve-favicon');
var winston = require('winston');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
require("./config/mongoose_client");
var indexRoute = require('./routes/index.routes');
var authRoutes = require('./routes/auth.routes');
var apdiscovery = require('./routes/ap.discovery');
var middlewareRoutes = require('./routes/middleware.routes');
var usersRoutes = require('./routes/users.routes');
var dataCenterRoutes = require('./routes/datacenters.routes');
var controllerRoutes = require('./routes/controllers.routes');
var apRoutes = require('./routes/ap.routes');
var zonesRoutes = require('./routes/zones.routes');
var InventoryRoutes = require('./routes/inventory.routes');
var ConfigBackupRoutes = require('./routes/configbackup.routes');
var myFileRoute = require('./routes/file')
var adminActivities = require('./routes/adminactivities.routes')
const http = require('http');
var dns = require('dns');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');
dnscache = require('dnscache')({
  "enable" : true,
  "ttl" : 600,
  "cachesize" : 1000
});
// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'ejs');

//app.use(favicon(path.join(__dirname, 'dist', 'favicon.ico')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);
	
	req.headers['content-type'] = req.headers['content-type'] || 'application/json';
	
	next();
});
app.use(bodyParser.json());
app.use(bodyParser.text({ limit: "10mb"}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));

//app routes middleware
app.use('/', apdiscovery);
app.use('/api', authRoutes);
app.use('/api', middlewareRoutes);
app.use('/api', indexRoute);
app.use('/api', apRoutes);
app.use('/api', usersRoutes);
app.use('/api', dataCenterRoutes);
app.use('/api', controllerRoutes);
app.use('/api', zonesRoutes);
app.use('/api', InventoryRoutes);
app.use('/api', ConfigBackupRoutes);
app.use('/api', myFileRoute);
app.use('/api', adminActivities);


// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Handle 404
app.use(function(req, res, next) {
  console.log("req : "+req.url);  
  var err = new Error('Not Found');
  res.status(404);
  res.json({
	success: false,
	message: err.message
  });
});

// Handle 500
app.use(function(err, req, res, next) {
  res.status(500);
  res.json({
	success: false,
	message: '500 | Internal Server Error: ' + err.message
  });  
});

module.exports = app;
