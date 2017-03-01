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
// Hook up all the actual routes to the main app
app.use(require('./controllers'));

var server = app.listen(8080, function(){
    console.log("We have started our server on port 8080");
});

module.exports = server;
