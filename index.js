// Required packages
var twilio = require('twilio');
var sp = require('serialport');
var moment = require('moment');

var twilioSID = process.env.twilioSID;
var twilioAuthToken = process.env.twilioAuthToken;

// var sBuffer = [];
var mBuffer = "";

// INIT serial port
var serial = new sp.SerialPort("/dev/tty.usbserial",{
  baudrate: 9600,
  stopBits: 2
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
  var rawBytes = {
    status: split[0],
    temperature: split[1],
    unknown: split[2],
    setPoint: split[3]
  };
  console.log(rawBytes);
  processTemp(rawBytes.temperature);
}

function processTemp (tempBytes) {
  var i = parseInt(tempBytes, 16);
  var t = i / 129 - 243.7519;
  console.log(i);
  console.log(Math.round(t)+"ºC");
}

function addToLogFile (data) {
  fs.appendFile('logData.txt', data, function (err) {
    if (err !== undefined){
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
