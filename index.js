// Required packages
var twilio = require('twilio');
var sp = require('serialport');
var moment = require('moment');
var mqtt = require('mqtt');
var fs = require('fs');
var ultima2 = require('./ultima2.js');

var conf = {
  "rejectUnauthorized": false,
  "username" : process.env.MQTTUsername,
  "password" : process.env.MQTTPassword
}
var client = mqtt.connect(process.env.MQTTHost, conf);
var topic = process.env.MQTTTopic;
var maxSlope = 0.15;             //Determined looking at longitudinal data
var refreshInterval = 15000;    //In milliseconds
var flag = false;               //Flag to start alerting check routine
var timeOpen = [];              //Keeps dates for how long flag has been on
var values = [];
var times = [];

var mBuffer = "";
var tm;
var stmFlag = true;

// INIT serial port
var serial = new sp.SerialPort("/dev/ttyAMA0",{
  baudrate: 9600
});

/*********************MQTT*********************/
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
/*******************END MQTT*******************/

/*********************SERIAL*********************/
//When serial is open
serial.open(function (error) {
  if ( error ) {
    console.log('>>> Failed to open serial port. Error: ' + error);
  } else {
    console.log('>>> Serial port open');
    serial.flush(function(){
      console.log(">>> Serial port flushed");
      //ultima2.sendQuit(serial);
      ultima2.getTPacket(serial);
    });

  }
});

//On error of the Serial comm
serial.on("error", function(error){
  var mo = moment().format('MMMM Do YYYY, h:mm:ss a');
  var message = ">>> Serial port error at: " + mo + "\nError: " + error;
  console.log(message);
});

//When closing the serial port
serial.on("close", function(){
  var mo = moment().format('MMMM Do YYYY, h:mm:ss a');
  var message = ">>> Serial port closed at: " + mo;
  console.log(message);
});

//Fires when data is received from the serial port
serial.on('data', function(data) {
  console.log('>>> Serial data received: ' + data);
  mBuffer += data;
  if (stmFlag === true){
    stmFlag = false;
    tm = setTimeout(function(){
      //This executes after 1s (timeout for the serial TX)
      dataTimeoutCB(mBuffer);
      clearTimeout(tm);
      stmFlag = true;
      mBuffer = "";
    }, 1000);
  }
});

//Function that executes when the serial port transmit timeout triggers
function dataTimeoutCB (mBuffer) {
  console.log(">>> Serial data stopped streaming, buffer length is: " + mBuffer.length);
  if (mBuffer.length < 16 && mBuffer.length > 0){
    console.log(">>> Don't have enough data! L="+mBuffer.length);
    console.log(mBuffer);
  }else if (mBuffer.length == 16){
    // console.log(">>> Have enough! L="+mBuffer.length);
    // console.log(mBuffer);
    var processed = ultima2.processData(mBuffer);
    var now = new Date();
    addToLogFile(now+","+processed.temperature, 'tempLog.txt');
    //Push the latest values and timestamps correctly
    if (values.length < 2){
      values.push(processed.temperature);
      times.push(now);
    }else{
      values.splice(0,1);
      times.splice(0,1);
      values.push(processed.temperature);
      times.push(now);
    }
    //Calculate the slope and set the alert flag if it's higher than a threshold
    var slope = getSlope(values,times);
    console.log(">>> Slope is "+slope.toFixed(10));
    if (slope > maxSlope) { flag = true; }
    //Keep the correct time diff
    if (flag) {
      console.log(">>> Freezer is in alert");
      timeOpen[1] = now;
    }else{
      timeOpen = timeOpen.slice(1,1);
      timeOpen.push(now);
    }
    //Check whether we need to alert the user
    checkTimeOpen(timeOpen);
    //Publish the temperature to the live front end using MQTT
    var packet = {
      "x" : Date.now(),
      "y" : processed.temperature,
      "source" : "revco015",
      client_id : client.options.clientId,
      reading_id : "freezer"
    };
    client.publish(topic, JSON.stringify(packet));
    console.log(">>> Published processed temperature to MQTT topic: "+topic);
    console.log("\n");
  }else if (mBuffer.length === 0){

  }else{
    console.log(">>> Not sure? L="+mBuffer.length);
    console.log(mBuffer);
  }
}
/********************END SERIAL********************/

function checkTimeOpen(timeOpen) {
  //Calculate time difference, in seconds
  var timeDiff = (timeOpen[1] - timeOpen[0]) / 1000;
  //Check if flag is set
  if (flag) {
    console.log(">>> Freezer has been in alert for "+parseInt(timeDiff/60)+" minutes");
    console.log("DEBUG: timeOpen is "+timeOpen);
    //If has been open for more than 15m
    if(timeDiff > 900){
      //Contact users using SMS service
      client.publish(topic, 'CONTACTING USERS *NOT IMPLEMENTED YET*');
      flag = false;
      timeOpen = [];
    }else{
      client.publish(topic, 'Alert, temperature climbing for '+parseInt(timeDiff/60)+' minutes</font>');
    }
  }
}

//Calculate slope
function getSlope (values,times) {
  return slope = (values[1] - values[0]) / (times[1] - times[0]);
}

//Add data to log file
function addToLogFile (data, filepath) {
  fs.appendFile(filepath, data+'\n', function (err) {
    if (err){
      console.log(err);
      console.log(">>> Error logging data to log file! Data was: " + data);
    }
  });
}

/********************MAIN********************/
var interval = setInterval(function (){
  ultima2.getTPacket(serial);
}, refreshInterval);
/******************END MAIN******************/

/********************EXPORTS********************/
module.exports.getSlope = getSlope;
/******************END EXPORTS******************/
