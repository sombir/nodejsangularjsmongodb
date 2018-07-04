var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var AuditTrailSchema = new Schema({
    sourceip: { type : String , required: true },
    action: { type : String , required: true },
    managedby: { type : String , required: true, default : 'System' },
    resource: { type : String , required: true },
    description: { type : String , required: true },
    activitytime: { type: Date},
	username: { type : String , required: true },
});

// on every save, add the date
AuditTrailSchema.pre('save', function(next) {
  var currentDate = new Date();
  if (!this.activitytime)
    this.activitytime = currentDate;

  next();
});


var AuditTrailModel = mongoose.model('audittrail', AuditTrailSchema);

module.exports = AuditTrailModel;

