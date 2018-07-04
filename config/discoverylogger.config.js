var winston = require('winston');
var UserModel = require('../models/UserModel');
var fs = require('fs');
var mkdirp = require('mkdirp');
var moment = require('moment');
var dateTime = moment().unix(); 
var filename = 'discovery-'+dateTime+'.log';
var filepath = "/var/log/cds/";
//check if dir exists, if not found create directory first
if(!fs.existsSync(filepath)){    
	mkdirp(filepath, function (err) {
		if (err) console.error(err)
		else console.log(filepath + ' does not exist. Create the directory first')
	});
}
var fileLogsLevel = 'info'
var logsFilePath = filepath + filename
var maxFileSize = 5000000
var maxNumberOfFiles = 5

var DLogger = new (winston.Logger)({
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
			DLogger.info(err)
		}else if(logsConfigInfo){
			let logsconfig = logsConfigInfo.logsconfig
			let fileLogsLevel = logsconfig.severity ? logsconfig.severity : ''
			let isFileLogEnabled = logsconfig.enable ? true : false
			let maxFileSize = logsconfig.filesize ? logsconfig.filesize : ''
			let maxNumberOfFiles = logsconfig.maxfiles ? logsconfig.maxfiles : ''
			
			if(fileLogsLevel){
				DLogger.transports['file'].level = fileLogsLevel	
			}
			if(maxFileSize){
				let fileSizeInBytes = maxFileSize*1000000 // (1MB -> 1000000)
				DLogger.transports['file'].maxsize = fileSizeInBytes	
			}
			if(maxNumberOfFiles){
				DLogger.transports['file'].maxFiles = maxNumberOfFiles	
			}
		}
	});
} catch(e) {
	DLogger.info('Initialization of config logs settings failed with error')
	DLogger.error(e)
}

module.exports = DLogger;


