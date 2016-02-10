var express = require('express');
var fs = require('fs');
var mqtt = require('mqtt');
var index = require('./index.js');
var exphbs = require('express-handlebars');

var app = express();
app.use(express.static(__dirname + '/server'));
app.engine('.hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
app.set('view engine', '.hbs');

app.get('/history', function (req, res) {
  fs.readFile('tempLog.txt', 'utf8', function (err,data) {
    if (err) {
      res.send("Error reading the file: "+err);
    }
    console.log(">>> DATA: "+data.length);
    data = data.split("\n");
    var meow = { m : data };
    res.render('history',meow);
  });
});

app.get('/live', function (req, res) {
  res.render('live');
});

app.listen(12345, function () {
  console.log('Example app listening on port 12345!');
});
