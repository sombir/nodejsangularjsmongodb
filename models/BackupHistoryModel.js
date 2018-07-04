var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var BackupHistorySchema = new Schema({
    clusterId: { type : String , required: true },
    description: { type : String , required: false },
    backupStatus: { type : String , required: false },
    backupProgress: { type : String , required: false },
    error: { type : String , required: false },
    backuptype:  { type: {}, default : '', required: true },
	cdsfileDir: { type : String , required: false },
	remotefileDir: { type : String , required: false },
    file: { data: Buffer, contentType: String },
    filename: { type : String , required: false },
    filesize: { type : String , required: false },
    version: { type : String , required: false },
    backupTimestamp: { type: Date},
    date_updated : { type: Date}
});


// on every save, add the date
BackupHistorySchema.pre('save', function(next) {
	// get the current date
	var currentDate = new Date();
	this.backupTimestamp = currentDate;
	// if creationtime doesn't exist, add to that field
	if (!this.date_updated)
		this.date_updated = currentDate;

	next();
});

var BackupHistoryModel = mongoose.model('backuphistory', BackupHistorySchema);

module.exports = BackupHistoryModel;

