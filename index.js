// Required packages
var twilio = require('twilio');
var sp = require('serialport');
var moment = require('moment');

var twilioSID = process.env.twilioSID;
var twilioAuthToken = process.env.twilioAuthToken;

// INIT serial port
var serial = new sp.SerialPort("/dev/ttyAMA0",{
  baudrate: 9600,
  stopBits: 2
});

function getNVRAM(serial){
  console.log(serial);
  serial.write("T", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
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
  console.log('>>> Serial data received: ' + data);
});
