var express = require('express');
var nunjucks = require('nunjucks');

var app = express();

nunjucks.configure('views', {
    autoescape: true,
    throwOnUndefined: true,
    noCache: true,
    express: app
});

app.use(express.static('public'));

app.get('/',function(req, res){
    res.render('public/index.html');
});

var server = app.listen(8080 ,function(){
    console.log("We have started our server on port 8080");
});

module.exports = server;
