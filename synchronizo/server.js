var express = require('express');
var nunjucks = require('nunjucks');

var app = express();
module.exports.app = app;

// Initialize the rooms to be empty
app.locals.rooms = {};

nunjucks.configure('views', {
    autoescape: true,
    throwOnUndefined: true,
    noCache: true,
    express: app
});

// Serve static files from express for now
app.use(express.static('public'));

var server = app.listen(8080, function(){
    console.log("We have started our server on port 8080");
});

io = require('socket.io')(server);

// Hook up all the actual routes to the main app
app.use(require('./controllers'));

module.exports = server;
module.exports.io = io;
