var express = require('express');
var router = express.Router();
var app = require('../server').app;

var MusicRoom = require('../models/MusicRoom');
var createNewRoom = MusicRoom.createNewRoom;


router.get('/create', function(req, res) {
    var room = createNewRoom(app.locals.rooms);

    res.redirect(room.name);
});

router.get('/:roomName', function (req, res) {
    var name = req.params.roomName;

    if (!(name in app.locals.rooms)) {
        res.status(404);
        res.send("Room not found");
        return;
    }

    var room = app.locals.rooms[name];
    res.render('public/room.html', {room: room});
})

module.exports = router;
module.exports.createNewRoom = createNewRoom;
