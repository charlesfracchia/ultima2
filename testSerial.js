var sp = require('serialport');
var serial = new sp.SerialPort("/dev/ttyAMA0",{
  baudrate: 9600,
  stopBits: 2
});

serial.open(function (error) {
  if ( error ) {
    console.log('>>> Failed to open serial port. Error: ' + error);
  } else {
    console.log('>>> Serial port open');
    serial.write("T", function(err, results) {
        if (err){
          console.log('>>> Error writing status request packet:' + err);
        }else{
          console.log(">>> Sent status request packet (T)");
        }
    });
  }
});

serial.on('data', function(error, data){
  if (error) {
    console.log('>>> Serial port data error: ' + error);
  } else {
    console.log('>>> Data received: ' + data.toString());
  }
});
