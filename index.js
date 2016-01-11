// Required packages
var twilio = require('twilio');
var sp = require('serialport');
var moment = require('moment');
var fs = require('fs');
var convertBase = require('./convertBase.js').convertBase;
// console.log(convertBase.hex2bin());

var twilioSID = process.env.twilioSID;
var twilioAuthToken = process.env.twilioAuthToken;

var mBuffer = "";

// INIT serial port
var serial = new sp.SerialPort("/dev/ttyAMA0",{
  baudrate: 9600,
  stopBits: 2,
  parser: sp.parsers.raw
});

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
    getNVRAM(serial);
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

serial.on('data', function(data) {
  //console.log('>>> Serial data received: ' + data);
  mBuffer += data;
  if (mBuffer.length < 16){
    //console.log("Don't have enough data yet");
  }else{
    console.log(">>> Have enough!");
    console.log(mBuffer);
    processData(mBuffer);
    mBuffer = "";
  }
});

var interval = setInterval(function (){
  getNVRAM(serial);
}, 5000);

module.exports.processData = processData;
