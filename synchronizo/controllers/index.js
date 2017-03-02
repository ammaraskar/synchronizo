var express = require('express');
var router = express.Router();
var app = require('../server').app;

router.use('/room', require('./music_room'))


router.get('/', function(req, res) {
    var rooms = [];

    for (var room in app.locals.rooms) {
        rooms.push(app.locals.rooms[room]);
    }

    res.render('public/index.html', {rooms: rooms});
});

router.get('/login', function(req,res) {
    res.render('public/login.html');
});

module.exports = router;
