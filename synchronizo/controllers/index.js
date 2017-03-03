var express = require('express');
var router = express.Router();
var app = require('../server').app;

router.use('/room', require('./music_room'))
router.use('/api', require('./api'))


router.get('/', function(req, res) {
    var rooms = [];

    for (var room in app.locals.rooms) {
        rooms.push(app.locals.rooms[room]);
    }

    console.log(req.user);
    res.render('public/index.html', {rooms: rooms});
});

module.exports = router;
