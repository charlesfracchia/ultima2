var fs = require('fs');
var mqtt = require('mqtt');
var index = require('./index.js');

var client = mqtt.connect('mqtt://test.mosquitto.org');
var topic = "/CBA/015/n80Freezer";

client.on('connect', function () {
  console.log(">>> Connected to MQTT hub");
  console.log(">>> Subscribed to "+ topic);
  client.subscribe(topic);
});

var deet = null;
fs.readFile('logData.txt', 'utf8', function (err,data) {
  if (err) { console.log("Error reading the file: "+err); }
  console.log(">>> DATA: "+data.length);
  console.log(">>> DATA: "+typeof(data));
  deet = data.split("\n");
});

var idx = 0;
setInterval(function(){
  var proc = index.processData(deet[idx]);
  console.log(">>> Index: " + idx);
  if (proc.temperature !== NaN){
    console.log(">>> Temp: " + proc.temperature);
    client.publish(topic, "T="+proc.temperature);
  }
  idx++;
},3000);

