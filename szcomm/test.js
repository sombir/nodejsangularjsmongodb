var Inventory34 = require('./inventory34');
var Inventory35 = require('./inventory35');
var Connection = require('./connection');



// this will return the Inventory obj based on the connection.
function getInventoryObj(conn, clusterName, isTest ) {
  if (conn.is35orLater()) {
    inventoryVerObj = new Inventory35(conn, clusterName, isTest)
  } else {
    inventoryVerObj = new Inventory34(conn, clusterName, isTest)
  }
  return inventoryVerObj
}

async function main(){
  conn = new Connection("szcluster1", "10.150.84.45",  "admin", "Ruckus123$");
  Connection.register(conn);
  let validsession = await conn.getValidateSessionAsync()
  var inv = getInventoryObj(conn, "szcluster1")//new Inventory(cnn,"Cluster47",true);.
  /*
  syssummary = await inv._getSystemSummary();
  console.log(syssummary);
  zoneDetail = await inv._getZoneInventory();
  console.log(zoneDetail);
  cpList = await inv._getCpList();
  console.log(cpList);
  dpList = await inv._getDpList();
  console.log(dpList);
  */
  szdata = await inv._getSmartZoneData();
  console.log(szdata);


  //szDetail
  //console.log(valSession);
}

main();
