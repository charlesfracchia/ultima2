var express = require('express');
var fs = require('fs');
var mqtt = require('mqtt');

var app = express();
app.use(express.static(__dirname + '/server'));

var client = mqtt.connect('mqtt://test.mosquitto.org');
var topic = "/CBA/015/n80Freezer";

client.on('connect', function () {
  console.log(">>> Connected to MQTT hub");
  console.log(">>> Subscribed to "+ topic);
  client.subscribe(topic);
});

app.get('/', function (req, res) {
  fs.readFile('logData.txt', 'utf8', function (err,data) {
    if (err) {
      res.send("Error reading the file: "+err);
    }
    console.log(">>> DATA: "+data.length);
    console.log(">>> DATA: "+typeof(data));
    for (i=0; i<data.length+1; i++){
      var proc = index.processData(data[i]);
      console.log(proc.temperature);
      client.publish(topic, "T="+proc.temperature);
    }
    res.send("Success");
  });
});

app.get('/live', function (req, res) {
  res.sendFile(__dirname + '/server/index.html');
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
