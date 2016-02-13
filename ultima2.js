var convertBase = require('./convertBase.js').convertBase;

function sendQuit (serial) {
  serial.write("Q", function(err, results) {
    if (err !== undefined){
      console.log('err ' + err);
    }else{
      console.log(">>> Sent TELEM stop packet (Q)");
    }
  });
}

function getTPacket(serial){
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
  return bytes;
}

function processTemp (tempBytes) {
  var i = parseInt(tempBytes, 16);
  var t = i / 129 - 243.7519;
  return parseFloat(t).toFixed(2);
}

function processStatus (statusBytes) {
  var sta = convertBase.hex2bin(statusBytes);
  var diff = 16 - sta.length;
  sta = "0".repeat(diff) + sta;

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

module.exports.sendQuit = sendQuit;
module.exports.getTPacket = getTPacket;
module.exports.processData = processData;
module.exports.processTemp = processTemp;
module.exports.processStatus = processStatus;
