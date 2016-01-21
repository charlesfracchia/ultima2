// Required packages
var twilio = require('twilio');
var sp = require('serialport');
var moment = require('moment');
var mqtt = require('mqtt');
var fs = require('fs');
var convertBase = require('./convertBase.js').convertBase;

var client  = mqtt.connect('mqtt://test.mosquitto.org');
var topic = "/CBA/015/n80Freezer";
var twilioSID = process.env.twilioSID;
var twilioAuthToken = process.env.twilioAuthToken;
var maxSlope = 10;              //In loss of ºC/Hr
var refreshInterval = 15000;    //In milliseconds
var nbPoints = 60*60/refreshInterval/1000;   //Number of points used for trend averaging
var slopeBuffer = [];

var mBuffer = "";
var tm;
var stmFlag = true;

// INIT serial port
var serial = new sp.SerialPort("/dev/ttyAMA0",{
  baudrate: 9600
});

client.on('connect', function () {
  console.log(">>> Connected to MQTT hub");
  console.log(">>> Subscribed to "+ topic);
  client.subscribe(topic);
});

client.on('message', function (topic, message) {
  var message = message.toString();
  console.log(">>> Received topic message: " + message);
  if (message[0] === "I"){
    var interval = parseInt(message.replace("I=",""));
    console.log(">>> Received interval update message. Updating to "+interval+" ms refresh interval");
    refreshInterval = interval;
  }
});

function sendQuit (serial) {
  serial.write("Q", function(err, results) {
    if (err !== undefined){
      console.log('err ' + err);
    }else{
      console.log(">>> Sent TELEM stop packet (Q)");
    }
  });
}

function getNVRAM(serial){
  serial.write("T", function(err, results) {
    if (err !== undefined){
      console.log('err ' + err);
    }else{
      console.log(">>> Sent status request packet (T)");
    }
  });
}

function processData (data) {
  var split = data.match(/.{1,4}/g);
  var bytes = {
    status: split[0],
    temperature: split[1],
    unknown: split[2],
    setPoint: split[3]
  };
  bytes.temperature = processTemp(bytes.temperature);
  bytes.status = processStatus(bytes.status);
  bytes.setPoint = processTemp(bytes.setPoint);
  // addToLogFile(data);
  console.log(bytes);
  return bytes;
}

function processTemp (tempBytes) {
  var i = parseInt(tempBytes, 16);
  var t = i / 129 - 243.7519;
  return Math.round(t);
}

function processStatus (statusBytes) {
  var sta = convertBase.hex2bin(statusBytes);
  var diff = 16 - sta.length;
  sta = "0".repeat(diff) + sta;
  console.log(sta.length);

  var alS = [];
  if (sta[14] == 1) alS.push("high");
  if (sta[15] == 1) alS.push("low");
  if (sta[16] == 1) alS.push("RTD test");

  var status = {
    battery : parseInt(sta[0]),
    power : parseInt(sta[1]),
    fuse : parseInt(sta[4]),
    filter : parseInt(sta[5]),
    compressor : {
      first : parseInt(sta[9]),
      second : parseInt(sta[10])
    },
    alarm : alS
  };
  return status;
}

function checkSlope (slidingWindow, nbPoints) {
  var slopeObj = {};
  if (slidingWindow.length < nbPoints){
    console.log(">>> Sliding window not full: " + slidingWindow.length  + "/" + nbPoints);
    slopeObj.hour = null;
    if (slidingWindow.length < nbPoints / 60){
      slopeObj.minute = null;
    }else{
      var dy = slidingWindow[slidingWindow.length-1] - slidingWindow[slidingWindow.length-(nbPoints/60)];
      slopeObj.minute = ;
    }
  }else{
    console.log(">>> Sliding window full");
  }
  var dy = slidingWindow[slidingWindow.length-1] - slidingWindow[0];
  return dy;
}

function addToLogFile (data) {
  fs.appendFile('logData.txt', data+'\n', function (err) {
    if (err){
      console.log(err);
      console.log(">>> Error logging data to log file! Data was: " + data);
    }
  });
}

serial.open(function (error) {
  if ( error ) {
    console.log('>>> Failed to open serial port. Error: ' + error);
  } else {
    console.log('>>> Serial port open');
    serial.flush(function(){
      console.log(">>> Serial port flushed");
      //sendQuit(serial);
      getNVRAM(serial);
    });

  }
});

serial.on("error", function(error){
  var mo = moment().format('MMMM Do YYYY, h:mm:ss a');
  var message = ">>> Serial port error at: " + mo + "\nError: " + error;
  console.log(message);
});

serial.on("close", function(){
  var mo = moment().format('MMMM Do YYYY, h:mm:ss a');
  var message = ">>> Serial port closed at: " + mo;
  console.log(message);
});

function dataTimeoutCB (mBuffer) {
  console.log(">>> Serial data stopped streaming, buffer length is: " + mBuffer.length);
  if (mBuffer.length < 16 && mBuffer.length > 0){
    console.log("Don't have enough data! L="+mBuffer.length);
    console.log(mBuffer);
  }else if (mBuffer.length == 16){
    console.log(">>> Have enough! L="+mBuffer.length);
    console.log(mBuffer);
    var processed = processData(mBuffer);
    client.publish(topic, processed);
  }else if (mBuffer.length === 0){

  }else{
    console.log(">>> Not sure? L="+mBuffer.length);
    console.log(mBuffer);
  }
}

serial.on('data', function(data) {
  console.log('>>> Serial data received: ' + data);
  mBuffer += data;
  if (stmFlag === true){
    stmFlag = false;
    tm = setTimeout(function(){
      dataTimeoutCB(mBuffer);
      clearTimeout(tm);
      stmFlag = true;
      mBuffer = "";
    }, 1000);
  }
});

var interval = setInterval(function (){
  getNVRAM(serial);
}, refreshInterval);

module.exports.processData = processData;
module.exports.checkSlope = checkSlope;
