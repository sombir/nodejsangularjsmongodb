var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var AccessPointSchema = new Schema({
    apserial: { type: String, required: true, index: { unique: true }},
    clusterid: { type: String, required: false },
    clustername: { type: String, required: false },
    mac: { type: String, required: false },
    apname: { type: String, required: false },
	model: { type: String, required: false },
	ip: { type: String, required: false },
    zonename: { type: String, required: false },
    zoneid: { type: String, required: false },
    connectionstate: { type: String, enum : ['Discovery','Connect','Rebooting','Disconnect','Provisioned',''], default: '', required: false },
    configmethod: { type: String, enum : ['PROVISIONED','IMPORTED','UNPROVISIONED','DEFAULT_PROVISIONED'], default: 'PROVISIONED', required: true },
    cds_cluster_state: { type: String, enum : ['CONNECTED','NOTCONNECTED','FLAGGED','PREPROVISIONED','STRANDED','NOTINCLUSTER','REJECTED',''], default: '', required: false }, // To display un managed AP list {PREPROVISIONED,STRANDED,NOTINCLUSTER,REJECTED}
    clusterapstate: { type: String, enum : ['Online','Offline','Flagged',''], default: '', required: false }, //this will be used for tree structure display
    lastsynchtime: { type: Date},
    last_contacted: { type: Date},
    last_modified : { type: Date},
    username: { type: String, required: true}
});


// on every save, add the date
AccessPointSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();

  // if last_modified doesn't exist, add to that field
  if (!this.last_modified)
    this.last_modified = currentDate;

  next();
});

var APModel = mongoose.model('AccessPoint', AccessPointSchema);

module.exports = APModel;

