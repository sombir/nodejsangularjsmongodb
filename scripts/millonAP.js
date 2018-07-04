var APModel = require('../models/AccessPointModel');
var ClusterModel = require('../models/ClusterModel');
require("./mongo-connection");


var addAP = async function(cluster, numberofAP){
  var apArr = [];
  var count = 0;
  while(count < numberofAP){
    var randomnumber = Math.floor(Math.random()*999999999999) + 1;
    var newAP = new APModel({ apserial: '', clusterid : '', clustername : '', mac: '', apname: '', username:'admin'});
    if(apArr.indexOf(randomnumber) > -1) continue;
    newAP.apserial = randomnumber;
    newAP.clusterid = cluster._id;
    newAP.clustername = cluster.name;
    var finalMac='';
    for (var i = 0; i < 6; i++) {
      if (i==5) {
        finalMac=finalMac.concat((Math.floor(Math.random()*999) + 1).toString());
      } else {
        finalMac=finalMac.concat((Math.floor(Math.random()*999) + 1).toString().concat(':'));
      }
    }
    console.log(finalMac);
    newAP.mac = finalMac;
    newAP.apname = 'Sim-'+randomnumber;
    
    await newAP.save(function (err) {
      if (err){
        // logger.info(err)
        console.log('Error : ' + err);
      } else {
        console.log(newAP.apserial+" added to cluster "+ newAP.clustername +" successfully");                                                                                                                                                      
      }                                                                                                                                 
    }); 
    count+=1;
    apArr.push(newAP.apserial);
    if (count==(numberofAP-1)) {
      console.log(new Date().getTime());
    }
  }
};



var getClusters = function(){
  var queryFilter = ClusterModel.find({});
  var numberofAP = 25000;
  var totalAPs = 300000;
  var clustersWithAPs = (totalAPs/numberofAP);
  console.log(new Date().getTime());
  queryFilter.exec(function(err,clusters){
    if (err) {
      console.log('Error : ' + err);
    } else if (clusters) {
      console.log('Success');

      for (var i = 0; i < clusters.length; i++) {
        // console.log(clusters[i]);
        if (i<clustersWithAPs) {
          addAP(clusters[i], numberofAP);
        }
      }
    }
  });
}

getClusters();
