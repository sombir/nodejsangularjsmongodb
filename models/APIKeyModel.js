var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var APIKeySchema = new Schema({
    key: { type : String , required: true },
    description: { type : String , required: true },
    status: { type: String, enum : ['Active','Suspended'], default: 'Active', required: true },
    role: { type: String, default: 'Admin', required: false },
    creationtime: { type: Date, default : new Date(), required: true},
	last_modified: { type: Date },
	username: { type : String , required: true },
});

var APIKeyModel = mongoose.model('apikey', APIKeySchema);

module.exports = APIKeyModel;

