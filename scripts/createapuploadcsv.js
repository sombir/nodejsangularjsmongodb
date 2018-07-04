var fs = require('fs');

var dataToWrite = 'apserial,clusterip,apname,zonename \n';
var serialNo = 900000000000
var ip = '10.150.84.49';
var apName = 'test';
var zoneName = 'cdstest';
var length = process.argv.slice(2)[0];

for(var i = 0; i<length; i++){
                serialNo = Math.floor(100000000000 + Math.random() * 900000000000);
                apName = 'test'+i;
                dataToWrite += serialNo + ',' + ip + ',' +apName+ ','+ zoneName+'\n';
}

console.log(dataToWrite);

fs.writeFile('APUploadSampleCSV-'+length+'.csv', dataToWrite, 'utf8', function (err) {
  if (err) {
    console.log('Some error occured - file either not saved or corrupted file saved.'+err);
  } else{
    console.log('Total Data saved: ' + length);
  }
});
