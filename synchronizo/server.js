var express    =    require('express');
var app        =    express();

app.get('/',function(req,res){
    res.send('Hello world\n This is a test\n');
});

app.get('/foo/bar',function(req,res){
    res.send('Hello world\n This is a test\n');
});

var server     =    app.listen(8080 ,function(){
    console.log("We have started our server on port 8080");
});

module.exports = server;
