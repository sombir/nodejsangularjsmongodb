var axios = require('axios')
var co = require('co');
var util = require('util');
const _ = require('lodash');
const cron = require('node-cron');
var Connection = require('./connection');
var Inventory = require('./inventory');
var logger = require("../config/logger.config");



class Inventory34 extends Inventory{

  _getZoneInventory() {
    var selfthis = this;
	const loginDomain = selfthis._conn.getLoginDomain()
    let request = {
      managementIp: selfthis._conn.getBaseUrlMgmtIp(),
      clusterName: selfthis._getClusterName(),
      url:  selfthis._conn.getBaseUrl() + '/scg/zones/inventory/byDomain/' + loginDomain.domainUUID,
      operation: 'Get Zone Inventory'
    }

    return Connection.getAxios().get(request.url, {
      params: {
          limit: 2147483647,
          page: 1,
          start: 0
      },
      headers: selfthis._conn.getCommonHeaders()
    })
    .then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        selfthis._onControllerCallSuccess(request)
        let data = response.data.data, list = data.list
        let zoneSummary = [], osTypeSummary = [], apModelSummary = [], apStateSummary={total: 0, online: 0, offline: 0, flagged: 0}
        const controllerId = selfthis._conn.getControllerId()

        list.map((zone, i) => {
          const online = zone.connectedNum ? zone.connectedNum : 0
          const offline = zone.disconnectedNum ? zone.disconnectedNum : 0
          //const total = zone.totalApNum ? (online + offline) : 0 // 2.6.0 does not even have the totalApNum
		  const total = zone.totalApNum ? zone.totalApNum : (online + offline)
		  const flagged = total > 0 ? (total - (online + offline)) : 0
		  const thisZone = {
            clusterId: controllerId,
            domainId: loginDomain.domainUUID ? loginDomain.domainUUID : 'NA',
            domainName: loginDomain.domainName ? loginDomain.domainName : 'NA',
            zoneId: zone.zoneUUID,
            zoneName: zone.zoneName ? zone.zoneName : 'NA',
            apOnline: online,
            apOffline: offline,
            apFlagged: flagged,
            client: zone.clientNum ? zone.clientNum : 0
          }
          zoneSummary.push(thisZone)
          apStateSummary.total += zone.totalApNum
          apStateSummary.online += thisZone.apOnline
          apStateSummary.flagged += thisZone.apFlagged
          apStateSummary.offline += thisZone.apOffline

          _.keys(zone.clientOsTypeSummary).map((key, i) => {
            let osType
            if (key !== '0') { // 0 means finger printing not enabled
              osType = osTypeMap[key] ? osTypeMap[key].description : key
            } else {
              osType = 'Unknown'
            }
            osTypeSummary.push({
              clusterId: controllerId,
              domainId: loginDomain.domainUUID ? loginDomain.domainUUID : 'NA',
              domainName: loginDomain.domainName ? loginDomain.domainName : 'NA',
              zoneId: zone.zoneUUID,
              zoneName: zone.zoneName ? zone.zoneName : 'NA',
              osType: osType,
              count: zone.clientOsTypeSummary[key]
            })
          })

          let kindOfApsConnStatus = JSON.parse(zone.kindOfApsConnStatus)
          _.keys(kindOfApsConnStatus).map((key, i) => {
            let modelSummary = {
              clusterId: controllerId,
              domainId: loginDomain.domainUUID ? loginDomain.domainUUID : 'NA',
              domainName: loginDomain.domainName ? loginDomain.domainName : 'NA',
              zoneId: zone.zoneUUID,
              zoneName: zone.zoneName ? zone.zoneName : 'NA',
              apModel: key,
              apOnline: 0,
              apFlagged: 0,
              apOffline: 0}
            modelSummary.apOnline += kindOfApsConnStatus[key].connectAps
            modelSummary.apOffline += kindOfApsConnStatus[key].disconnectAps
            if (_.isUndefined(kindOfApsConnStatus[key].provisionedAps)) {
              // 2.6. the flagged AP by model data is not available on controller
              modelSummary.apFlagged += 0
            } else { // 3.2 and later
              modelSummary.apFlagged += kindOfApsConnStatus[key].provisionedAps
              modelSummary.apFlagged += kindOfApsConnStatus[key].rebootingAps
              // there is a controller bug that the discovery APs was not calculated correctly,
              // ignore it for now
              //modelSummary.apFlagged += kindOfApsConnStatus[key].discoveryAps
            }

            if (modelSummary.apOnline > 0 || modelSummary.apFlagged > 0 || modelSummary.apOffline > 0) {
              // not every model is deployed, trim down the data
              apModelSummary.push(modelSummary)
            }
          })
        })
		return { "zonesummary" : zoneSummary, "ostypesummary" : osTypeSummary, "apmodelsummary" : apModelSummary}
      } else {
        selfthis._onControllerCallResponseError(request, response)
      }
    })
    .catch((err) => {
      selfthis._onControllerCallError(request, err)
    })
  }

  _getCpList() {
    var selfthis = this;
	let request = {
      managementIp: selfthis._conn.getBaseUrlMgmtIp(),
      clusterName: selfthis._getClusterName(),
      url:  selfthis._conn.getBaseUrl() + '/scg/planes/control',
      operation: 'Get Control Planes'
    }

    return Connection.getAxios().get(request.url, {
      headers: selfthis._conn.getCommonHeaders()
    }).then((response) => {

      if (response.status === 200 && response.data && response.data.success) {
        selfthis._onControllerCallSuccess(request)

        let cps = [], managementIps = [], list = response.data.data.list
        _.forEach(list, (data) => {
          let cp = {}
          cp.cpId = data.key
          cp.model = selfthis._cpModelConverter(data.model)
          cp.mac = data.mac ? data.mac : 'NA'
          cp.serialNumber = data.serialNumber ? data.serialNumber : 'NA'
          cp.version = data.firmware ? data.firmware : 'NA'
          cp.name = data.name ? data.name : 'NA'
          cp.status = selfthis._cpStatusConverter(data.healthEnum)
          cp.role = data.role ? data.role : 'NA'
          cp.uptimeInSecs = data.uptimeSec ? data.uptimeSec : 0
          let mgmtBinding = data.bindingInterfaces.Management
          let controlBinding = data.bindingInterfaces.Control
          cp.managementIp = data.bindingIps[mgmtBinding] ? data.bindingIps[mgmtBinding] : ''
          cp.controlIp = data.bindingIps[controlBinding] ? data.bindingIps[controlBinding] : ''
		  cp.controlIpv6 = data.v6ApEtherIp ? data.v6ApEtherIp : ''
		  cp.managementIpv6 = data.v6WebEtherIp ? data.v6WebEtherIp : ''		  		  
          cp = _.assign(cp, selfthis._parseDiskInfo(data.diskInfo))
          cps.push(cp)
          managementIps.push(cp.managementIp)
          if (cp.status !== 'online') {
            logger.info('Control plane (%s) status is not online. Controller returned status is (%s)', data.key, data.healthEnum)
          }
        })
		// make sure we update the connection's available management IP list
        selfthis._conn.updateAvailableIps(managementIps)
        logger.info('update the list of management ip (%j) for controller (%s)', managementIps, selfthis._getClusterName())
        
		return cps		
      } else {
        selfthis._onControllerCallResponseError(request, response)
      }
    })
    .catch((err) => {
      selfthis._onControllerCallError(request, err)
    })
  }

  _getDpList() {
    var selfthis = this;
	let request = {
      managementIp: selfthis._conn.getBaseUrlMgmtIp(),
      clusterName: selfthis._getClusterName(),
      url:  selfthis._conn.getBaseUrl() + '/scg/planes/data',
      operation: 'Get Data Planes'
    }

    return Connection.getAxios().get(request.url, {
      headers: selfthis._conn.getCommonHeaders()
    }).then((response) => {
      if (response.status === 200 && response.data && response.data.success) {
        selfthis._onControllerCallSuccess(request)

        let dps = [], list = response.data.data.list
        _.forEach(list, (data) => {
          let dp = {}
          dp.mac = data.key ? data.key : 'NA'
          dp.model = data.model ? data.model : 'NA'
          dp.serialNumber = data.serialNumber ? data.serialNumber : 'NA'
          dp.version = data.fwVersion ? data.fwVersion : 'NA'
          dp.name = data.name ? data.name : 'NA'
          dp.cpId = data.cpId
          dp.cpName = data.cpName
          dp.ip = data.ip ? data.ip : 'NA'
          dp.status = selfthis._dpStatusConverter(data.status)
          dp.uptimeInSecs = data.uptime ? data.uptime : 0
          dps.push(dp)
          if (dp.status !== 'online') {
            logger.info('Data plane (%s) status is not online. Controller returned status is (%s)', data.key, data.status)
          }
        })
		return dps
      } else {
        selfthis._onControllerCallResponseError(request, response)
      }
    }).catch((err) => {
      selfthis._onControllerCallError(request, err)
    })
  }

  _getAPSummary() {
	var selfthis = this;
	const loginDomain = selfthis._conn.getLoginDomain()
	let request = {
		managementIp: selfthis._conn.getBaseUrlMgmtIp(),
		clusterName: selfthis._clusterName,
		url:  selfthis._conn.getBaseUrl() + '/scg/aps/byDomain/' + loginDomain.domainUUID,
		operation: 'Get AP Summary'
	}
	return Connection.getAxios().get(request.url, {
		params: {
			limit: 2147483647,
			page: 1,
			start: 0
		},
		headers: selfthis._conn.getCommonHeaders()
	})
	.then((response) => {
		if (response.status === 200 && response.data) {
			selfthis._onControllerCallSuccess(request)
			let responseData = response.data.data			
			return responseData.list
		} else {
			selfthis._onControllerCallResponseError(request, response)
		}
	})
	.catch((err) => {
		selfthis._onControllerCallError(request, err)
	})
  }
  
}

module.exports = Inventory34
