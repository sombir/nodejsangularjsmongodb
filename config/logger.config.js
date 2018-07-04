var winston = require('winston');
var UserModel = require('../models/UserModel');
var fs = require('fs');
var mkdirp = require('mkdirp');
var moment = require('moment');
var dateTime = moment().unix();
var filename = 'cds-app-'+dateTime+'.log'; 
var filepath = "/var/log/cds/";
//check if dir exists, if not found create directory first
if(!fs.existsSync(filepath)){    
	mkdirp(filepath, function (err) {
		if (err) console.error(err)
		else console.log(filepath + ' does not exist. Create the directory first')
	});
}
const BACKPROCESS = "appbackprocess";
startmodule = require.main.filename
if(startmodule.indexOf(BACKPROCESS) > -1) {
 filename = 'back-process-'+dateTime+'.log'; 
}
var fileLogsLevel = 'info'
var logsFilePath = filepath + filename
var maxFileSize = 5000000
var maxNumberOfFiles = 5

var logger = new (winston.Logger)({
	transports: [ 
		new winston.transports.File({ //transport for writing logs to file
			level: fileLogsLevel,
			filename: logsFilePath,
			timestamp: true,
			handleExceptions: true,
			json: false,
			maxsize: maxFileSize, //5MB
			maxFiles: maxNumberOfFiles,
			colorize: false,
			tailable: true
		})
	]
});

try {
	UserModel.findOne({username: 'admin'}, function (err, logsConfigInfo) {
		if(err){
			logger.info(err)
		}else if(logsConfigInfo){
			let logsconfig = logsConfigInfo.logsconfig
			let fileLogsLevel = logsconfig.severity ? logsconfig.severity : ''
			let isFileLogEnabled = logsconfig.enable ? true : false
			let maxFileSize = logsconfig.filesize ? logsconfig.filesize : ''
			let maxNumberOfFiles = logsconfig.maxfiles ? logsconfig.maxfiles : ''
			
			if(fileLogsLevel){
				logger.transports['file'].level = fileLogsLevel	
			}
			if(maxFileSize){
				let fileSizeInBytes = maxFileSize*1000000 // (1MB -> 1000000)
				logger.transports['file'].maxsize = fileSizeInBytes	
			}
			if(maxNumberOfFiles){
				logger.transports['file'].maxFiles = maxNumberOfFiles	
			}
		}
	});
} catch(e) {
	logger.info('Initialization of config logs settings failed with error')
	logger.error(e)
}

module.exports = logger;


