var express    =    require('express');
var app        =    express();

app.get('/',function(req,res){
    res.status(500).send('Something broke!');
});

var server     =    app.listen(8080 ,function(){
    console.log("We have started our server on port 8080");
});

module.exports = server;
