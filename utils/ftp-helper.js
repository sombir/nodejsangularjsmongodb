var path = require('path');
var logger = require("../config/logger.config");


exports.ftpDownload = function(remoteDir, filename, ftpconfig){
  return new Promise((resolve, reject) => {
    const EasyFtp = require('easy-ftp')
    const ftp = new EasyFtp()
    const localfile = path.join('/tmp', filename)
    const remotefile = path.join(remoteDir, filename)
    const operation = 'download ' + remotefile
    ftp.connect(ftpconfig)
    ftp.on('error', (err) => {
      logger.info('FTP command (%s) failed with error (%s)', operation, err.message)
      logger.info(err)
      reject(err)
    })
    ftp.download(remotefile, localfile, (err) => {
      if (err) {
        logger.info('FTP command (%s) failed with error (%s)', 'download ' + remotefile, err.message)
        logger.info(err)
        ftp.close()
        reject(err)
      } else {
        logger.info('FTP download completed successfully. localfile is (%s)', localfile)
        ftp.close()
        resolve(localfile)
      }
    })
  })
}

exports._mkdirIfNotExist = function(remoteDir, ftp, callback){
  ftp.exist(remoteDir, (exist) => {
    if (exist) {
      callback()
    } else {
      ftp.mkdir(remoteDir, (err) => {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      })
    }
  })
}

exports.ftpUpload = function(localfile, remoteDir, filename, ftpconfig){
  var view = this;
  return new Promise((resolve, reject) => {
    const operation = 'upload ' + localfile + ' to ' + remoteDir
    const EasyFtp = require('easy-ftp')
    const ftp = new EasyFtp()
    ftp.connect(ftpconfig)
    ftp.on('error', (err) => {
      logger.info('FTP command (%s) failed with error (%s)', operation, err.message)
      logger.info(err)
      reject(err)
    })
    view._mkdirIfNotExist(remoteDir, ftp, (err) => {
      if (err) {
        logger.info('FTP command (%s) failed with error (%s)', 'mkdir ' + remoteDir, err.message)
        logger.info(err)
        ftp.close()
        reject(err)
      } else {
        const remotefile = path.join(remoteDir, filename)
        ftp.upload(localfile, remotefile, (err) => {
          if (err) {
            logger.info('FTP command (%s) failed with error (%s)', operation, err.message)
            logger.info(err)
            ftp.close()
            reject(err)
          } else {
            logger.info('FTP command (%s) completed successfully. remote file is (%s)', operation, remotefile)
            ftp.close()
            resolve(remotefile)
          }
        })
      }
    })
  })
}

exports.ftpRemove = function(remoteDir, filename, ftpconfig){
  return new Promise((resolve, reject) => {
    const remotefile = path.join(remoteDir, filename)
    const operation = 'rm ' + remotefile
    const EasyFtp = require('easy-ftp')
    const ftp = new EasyFtp()
    ftp.connect(ftpconfig)
    ftp.on('error', (err) => {
      logger.info('FTP command (%s) failed with error (%s)', operation, err.message)
      logger.info(err)
      reject(err)
    })
    ftp.rm(remotefile, (err) => {
      if (err) {
        ftp.close()
        reject(err)
      } else {
        ftp.close()
        resolve()
      }
    })
  })
}
