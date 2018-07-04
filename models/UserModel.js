var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: { type: String, required: true, index: { unique: true }},
    password: { type: String, required: true },
    email: { type: String, required: true },
	allowunregisteredap: { type : Boolean , default: true },
	timezones: { type: String, required: false, default : "" },
	backupsettings:  { type: {}, default : {"enabled" : false, "frequency" : "* * * * *", "backuptype" : { "cds" : true, "tftp" : false } , "maxbackup" : 3, "localDir" : "/tmp", "tftpserver" : { "type" : "sftp", "host" : "", "" : "", "username" : "", "password" : "", "remotedir" : "/tmp" } } },
	backprocesssettings:  { type: {}, default : {"changed" : false, "enabled" : true, "frequency" : "*/15 * * * *"}},
	logsconfig:  { type: {}, default : {"changed" : false, "severity" : "info", "filesize" : 5, "maxfiles" : 5} },
    creationtime: { type: Date},
	date_updated : { type: Date},
    lastlogin: { type: Date},
	role: { type: String, enum : ['Admin'], default: 'Admin', required: true },
	active: {
		type: Number,
		enum: [1, 0],
		default: 1
    }
});


// on every save, add the date
UserSchema.pre('save', function(next) {
	// get the current date
	var currentDate = new Date();
	this.creationtime = currentDate;
	this.lastlogin = "";
	// if creationtime doesn't exist, add to that field
	if (!this.date_updated)
		this.date_updated = currentDate;

	next();
});

var User = mongoose.model('User', UserSchema);

module.exports = User;

