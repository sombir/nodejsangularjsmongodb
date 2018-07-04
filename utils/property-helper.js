const _ = require('lodash')
var logger = require("../config/logger.config");

exports.formatMessage = function(msgKey, msgValues, properties){
  if (!properties) {
    logger.info('The properties has to be defined')
    return 'Error'
  }
  if (!msgKey) {
    logger.info('The msgKey has to be defined')
    return 'Error'
  }

  // The string containing the format items (e.g. "{0}")
  let content = properties[msgKey]

  if (!content) {
    logger.info('The msgKey (%s) cannot be found in the properties', msgKey)
    return 'Error'
  }

  if (_.isEmpty(msgValues)) {
    // no value replacement needed
    return content
  }

  for (let i = 0; i < msgValues.length; i++) {
    content = _.replace(content, '{' + i + '}', msgValues[i])
  }
  return content
}
