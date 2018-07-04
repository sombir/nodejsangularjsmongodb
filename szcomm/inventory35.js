var axios = require('axios');
var co = require('co');
var util = require('util');
const _ = require('lodash');
var Connection = require('./connection');
var Inventory = require('./inventory');
var logger = require("../config/logger.config");


class Inventory35 extends Inventory{
	
  async _getZoneInventory() {
    return await this._getApModelByZone(0, [], [])
  }

  _getApModelByZone(page, apModelSummary, zoneSummary) {
    var selfthis = this;
	const request = {
	  managementIp: selfthis._conn.getBaseUrlMgmtIp(),
	  clusterName: selfthis._getClusterName(),
	  url:  selfthis._conn.getBaseUrl() + '/public/v5_0/query/countAPByZoneAndModelAndStatus',
	  operation: 'Get Zone Inventory (AP Models)'
	}

	return Connection.getAxios().post(request.url, {
	  limit: 1000,
	  page: page,
	  start: 0
	}, {
	  headers: selfthis._conn.getCommonHeaders()
	})
	.then((response) => {
	  if (response.status === 200 && response.data) {
		let list = response.data.list
		const controllerId = selfthis._conn.getControllerId()
		const loginDomain = selfthis._conn.getLoginDomain()
		_.forEach(list, (zone, index) => {
		  /* const apCountPerZone = {
			clusterId: controllerId,
			domainId: loginDomain.domainUUID ? loginDomain.domainUUID : 'NA',
			domainName: loginDomain.domainName ? loginDomain.domainName : 'NA',
			zoneId: zone.zoneId ? zone.zoneId : 'NA',
			zoneName: zone.zoneName ? zone.zoneName : 'NA',
			apOnline: 0,
			apFlagged: 0,
			apOffline: 0,
			client: 0 // has to hard code the client for now...
		  } */
		  _.forIn(zone.model2StatusCount, (value, key) => {
			apModelSummary.push({
			  clusterId: controllerId,
			  domainId: loginDomain.domainUUID ? loginDomain.domainUUID : 'NA',
			  domainName: loginDomain.domainName ? loginDomain.domainName : 'NA',
			  zoneId: zone.zoneId ? zone.zoneId : 'NA',
			  zoneName: zone.zoneName ? zone.zoneName : 'NA',
			  apModel: key,
			  apOnline: value.Online ? value.Online : 0,
			  apFlagged: value.Flagged ? value.Flagged : 0,
			  apOffline: value.Offline ? value.Offline: 0
			})
			/* apCountPerZone.apOnline += value.Online ? value.Online : 0
			apCountPerZone.apFlagged += value.Flagged ? value.Flagged : 0
			apCountPerZone.apOffline += value.Offline ? value.Offline: 0 */
		  })
		  //zoneSummary.push(apCountPerZone)
		})
		if (response.data.hasMore) {
		  selfthis._getApModelByZone(page+1, apModelSummary)
		} else {
		  selfthis._onControllerCallSuccess(request)
		  let inventoryData = selfthis._getOsTypeByZone(0, [], apModelSummary)
		  return inventoryData
		}
	  } else {
		selfthis._onControllerCallResponseError(request, response)
	  }
	})
	.catch((err) => {
	  selfthis._onControllerCallError(request, err)
	})
  }

  _getOsTypeByZone(page, osTypeSummary, apModelSummary) {
    var selfthis = this;
	const request = {
	  managementIp: selfthis._conn.getBaseUrlMgmtIp(),
	  clusterName: selfthis._getClusterName(),
	  url:  selfthis._conn.getBaseUrl() + '/public/v5_0/clients/countByZoneAndOsType',
	  operation: 'Get Zone Inventory (Os Types)'
	}

	return Connection.getAxios().post(request.url, {
	  limit: 1000,
	  page: page,
	  start: 0
	}, {
	  headers: selfthis._conn.getCommonHeaders()
	})
	.then((response) => {
	  if (response.status === 200 && response.data) {
		let list = response.data.list
		const controllerId = selfthis._conn.getControllerId()
		const loginDomain = selfthis._conn.getLoginDomain()
		_.forEach(list, (zone, index) => {
		  let clientSum = 0
		  _.forIn(zone.osType2ClientCount, (value, key) => {
			osTypeSummary.push({
			  clusterId: controllerId,
			  domainId: loginDomain.domainUUID ? loginDomain.domainUUID : 'NA',
			  domainName: loginDomain.domainName ? loginDomain.domainName : 'NA',
			  zoneId: zone.zoneId ? zone.zoneId : 'NA',
			  zoneName: zone.zoneName ? zone.zoneName : 'NA',
			  osType: key,
			  count: value ? value : 0
			})
			clientSum += value ? value : 0
		  })
		})
		
		if (response.data.hasMore) {
		  selfthis._getOsTypeByZone(page+1, osTypeSummary, apModelSummary)
		} else {
		  selfthis._onControllerCallSuccess(request)
		  let inventoryData = selfthis._getZoneSummary(1, [], osTypeSummary, apModelSummary)
		  return inventoryData
		}
	  } else {
		selfthis._onControllerCallResponseError(request, response)
	  }
	})
	.catch((err) => {
	  selfthis._onControllerCallError(request, err)
	})
  }
  
  _getZoneSummary(page, zoneSummary, osTypeSummary, apModelSummary) {
	  var selfthis = this;
	  const controllerId = selfthis._conn.getControllerId()
	  const request = {
		managementIp: selfthis._conn.getBaseUrlMgmtIp(),
		clusterName: selfthis._getClusterName(),
		url:  selfthis._conn.getBaseUrl() + '/public/v5_1/query/zone',
		operation: 'Get Zone summary'
	  }
	  let postBody =  {"fullTextSearch":{"type":"OR","value":""}, "attributes":["*"], "sortInfo":{"sortColumn":"zoneName","dir":"ASC"},"page":page,"limit":1000};
	  return Connection.getAxios().post(request.url,
		postBody, {
		  headers: selfthis._conn.getCommonHeaders()
		})
		.then((response) => {
		  if (response.status === 200 && response.data) {
			let list = [];
			if (response.data.list){
			   list =  response.data.list
			}
			let zoneSummary = [];
			_.forEach(list, (zone, index) => {
			  const apCountPerZone = {
				clusterId: controllerId,
				domainId: zone.domainId ? zone.domainId  : 'NA',
				domainName: zone.domainName ? zone.domainName : 'NA',
				zoneId: zone.id ? zone.id : 'NA',
				zoneName: zone.zoneName ? zone.zoneName : 'NA',
				apOnline: zone.apCountOnline ? zone.apCountOnline : 0,
				apFlagged: zone.apCountFlagged ? zone.apCountFlagged : 0,
				apOffline: zone.apCountOffline ? zone.apCountOffline : 0,
			    type: zone.type ? zone.type : "NA",
				client: zone.clientCount?zone.clientCount:0
			  }
			  zoneSummary.push(apCountPerZone);
			})
			if (response.data.hasMore) {
			  selfthis._getZoneSummary(page+1, zoneSummary, osTypeSummary, apModelSummary)
			} else {
			  selfthis._onControllerCallSuccess(request)
			  return { "zonesummary" : zoneSummary, "ostypesummary" : osTypeSummary, "apmodelsummary" : apModelSummary}
			}
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
	  url:  selfthis._conn.getBaseUrl() + '/public/v5_0/cluster/control',
	  operation: 'Get Control Planes (3.5)'
	}

	return Connection.getAxios().get(request.url, {
	  headers: selfthis._conn.getCommonHeaders()
	}).then((response) => {

	  if (response.status === 200 && response.data) {
		selfthis._onControllerCallSuccess(request)

		let cps = [], managementIps = [], list = response.data.list
		_.forEach(list, (data) => {
		  let cp = {}
		  cp.cpId = data.key
		  cp.model = selfthis._cpModelConverter(data.model)
		  cp.mac = data.mac ? data.mac : 'NA'
		  cp.serialNumber = data.serialNumber ? data.serialNumber : 'NA'
		  cp.version = data.firmware ? data.firmware: 'NA'
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
	  url:  selfthis._conn.getBaseUrl() + '/public/v5_0/cluster/data',
	  operation: 'Get Data Planes (3.5)'
	}

	return Connection.getAxios().get(request.url, {
	  headers: selfthis._conn.getCommonHeaders()
	}).then((response) => {
	  if (response.status === 200 && response.data) {
		selfthis._onControllerCallSuccess(request)

		let dps = [], list = response.data.list
		_.forEach(list, (data) => {
		  let dp = {}
		  dp.mac = data.mac ? data.mac : 'NA'
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
		})
		return dps
	  } else {
		selfthis._onControllerCallResponseError(request, response)
	  }
	}).catch((err) => {
	  selfthis._onControllerCallError(request, err)
	})
  }
  
  _getAPSummary(){
	var selfthis = this;
	return new Promise(function(resolve,reject){
		_recursiveGetAPSummary(0,[])
		function _recursiveGetAPSummary(pager, apList) {				
			const loginDomain = selfthis._conn.getLoginDomain()
			let request = {
				managementIp: selfthis._conn.getBaseUrlMgmtIp(),
				clusterName: selfthis._clusterName,
				url:  selfthis._conn.getBaseUrl() + '/public/v5_0/query/ap',
				operation: 'Get AP Summary'
			}
			Connection.getAxios().post(request.url, {"sortInfo":{"sortColumn":"apMac","dir":"ASC"},"page":pager,"limit":1000}, {
			  headers: selfthis._conn.getCommonHeaders()
			})
			.then((response) => {
					if (response.status === 200 && response.data) {
						let responseData = response.data
						apList = responseData.list.concat(apList)
						if(responseData.hasMore){
							_recursiveGetAPSummary(pager+1, apList)
						}else{					
							selfthis._onControllerCallSuccess(request)
							resolve(apList)
						}
					} else {
						selfthis._onControllerCallResponseError(request, response)
					}
			})
			.catch((err) => {
				selfthis._onControllerCallError(request, err)
			})
		}
	})
  }
  
}

module.exports = Inventory35;
