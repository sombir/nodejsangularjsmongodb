require("./mongo-connection");
var ClusterModel = require('../models/ClusterModel');

var addCluster = function(clusters){
	for (var i = 0; i < clusters.length; i++) {
		var newController = new ClusterModel({ ip: clusters[i].ip, name : clusters[i].name, loginid: 'admin', password: 'admin', username:'admin' });
		newController.save(function (err,newClusterInfo) {
			if (err){
				console.log('Error : ' + err);
			} else if (newClusterInfo) {
				console.log('Success : Cluster ' + newClusterInfo.name + ' added successfully');
			}
		});
	}
};

var createClusterArray = function(){
   var numberofClusters = 20;
   var clusterArray = [];
   var count =0;
   while(clusterArray.length < numberofClusters){
      var newCluster = {ip:'', name:''};
      newCluster.name = "RuckusOffice"+(clusterArray.length+1);
      var finalIP='';
      for (var i = 0; i < 4; i++) {
         if (i==3) {
           finalIP=finalIP.concat((Math.floor(Math.random()*999) + 1).toString());
        } else {
           finalIP=finalIP.concat((Math.floor(Math.random()*999) + 1).toString().concat(':'));
        }
     }
     newCluster.ip = finalIP;
     clusterArray.push(newCluster);
     if (clusterArray.length==numberofClusters) {
      addCluster(clusterArray);
     }
   }
}

createClusterArray();