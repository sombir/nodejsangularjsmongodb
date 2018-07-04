var mongoose = require('mongoose');
var logger = require("../config/logger.config");
Schema = mongoose.Schema;

var TaskProgressSchema = new Schema({
    action: { type: String, required: true},
    status: { type: String, required: true },
    description: { type: String, required: false },
    starttime: { type: Date},
    endtime : { type: Date},
    username: { type: String, required: true}
});

// on every save, add the date
TaskProgressSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();
  // if last_modified doesn't exist, add to that field
  if (!this.starttime)
    this.starttime = currentDate;

  next();
});

var TPModel = mongoose.model('TaskProgress', TaskProgressSchema);

module.exports = TPModel;

