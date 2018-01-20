var express = require('express');
var path = require('path');  
var cors = require('cors');
//var routes = require('routes/');
var messages = require('./routes/messages');
var bodyParser = require('body-parser'); 
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade'); 

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({

    extended: false

})); 

app.use(express.static(path.join(__dirname, 'public')));
//app.use('/', routes);
app.use('/messages', messages);

app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
}); 
console.log('listening '); 
module.exports = app;
