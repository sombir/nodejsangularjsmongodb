var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var DataCenterSchema = new Schema({
    name: { type: String, required: true, index: { unique: true }},
    description: { type: String, required: false },
    date_created: { type: Date},
    date_updated : { type: Date},
    username: { type: String, required: true}
});


// on every save, add the date
DataCenterSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();
  
  this.date_created = currentDate;
  
  // if date_updated doesn't exist, add to that field
  if (!this.date_updated)
    this.date_updated = currentDate;

  next();
});

var DCModel = mongoose.model('DataCenter', DataCenterSchema);

module.exports = DCModel;

