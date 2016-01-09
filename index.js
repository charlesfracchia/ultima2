// Required packages
var twilio = require('twilio');
var sp = require('serialport');

var twilioSID = process.env.twilioSID;
var twilioAuthToken = process.env.twilioAuthToken;

// INIT serial port
var serial = new sp.SerialPort("/dev/tty.");
