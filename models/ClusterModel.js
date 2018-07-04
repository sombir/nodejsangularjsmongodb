var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var ClusterSchema = new Schema({
    ip: { type: String, required: true, index: { unique: true }},
    name: { type: String, required: false },
    loginid: { type: String, required: true },
    password: { type: String, required: true },
	tag: { type: String, required: false},
    managementips : { type : Array , default : [] },
    controllerips: { type : Array , default : [] },
    zones: { type : Array , default : [] },
    numberofaps: { type : Number , default : 0 },
    numberofimportedaps: { type : Number , default : 0 },
    numberofprovisionaps: { type : Number , default : 0 },
    numberofunprovisionaps: { type : Number , default : 0 },
    numberofdefaultprovisionaps: { type : Number , default : 0 },
	apsimported: { type : Boolean , default: false },
	defaultcluster: { type : Boolean , default: false },
    status: { type: Number,	enum : [0,1,2], default : 0 }, //0 - offline, 1 - online,  2 - flagged
	stats:  { type: {}, default : '' },
    lastsynchtime: { type: Date},   
	creationtime : { type: Date},	
	last_modified : { type: Date},	
    username: { type: String, required: true}
});

// on every save, add the date
ClusterSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();

  // if last_modified doesn't exist, add to that field
  if (!this.creationtime)
    this.creationtime = currentDate;
    this.last_modified = currentDate;

  next();
});

var ClusterModel = mongoose.model('Cluster', ClusterSchema);

module.exports = ClusterModel;

