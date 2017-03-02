var express = require('express');
var router = express.Router();
var server = require('../server');
var app = server.app;

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

function onUserRoomJoin(room, user) {
    io.to(room.name).emit('newUserJoin', {'username': user.username});
}

io.on('connection', function(socket) {
    var joinedRoom;

    socket.on('join', function(data) {
        var roomName = data.room;

        // room doesn't exist, nothing to do
        if (!(roomName in app.locals.rooms)) {
            return;
        }

        var room = app.locals.rooms[roomName];
        joinedRoom = room;

        console.log("user joining " + room.name);

        socket.join(room.name);
        onUserRoomJoin(room, {'username': 'Anonymous'});
    });

    socket.on('disconnect', function (data) {
        console.log('user disconnected');

        if (joinedRoom) {
            console.log('user leaving room ' + joinedRoom.name);
        }
    });
});

module.exports = router;
module.exports.createNewRoom = createNewRoom;
