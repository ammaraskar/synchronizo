var express = require('express');
var router = express.Router();
var server = require('../server');
var app = server.app;
var ID3 = require('id3-parser');
var multer = require('multer');
var upload = multer({ dest: 'tmp/' });

var User = require('../models/User');
var MusicRoom = require('../models/MusicRoom');
var Song = MusicRoom.Song;
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

router.post('/:roomName/upload', upload.single('song'), function (req, res) {
    var name = req.params.roomName;

    if (!(name in app.locals.rooms)) {
        res.status(404);
        res.send("Room not found");
        return;
    }

    console.log(req.file);

    var room = app.locals.rooms[name];
    var filename = req.file.originalname;

    var song = room.findUploadingSong(filename);
    if (song) {
        song.markUploaded();
        emitSongUploaded(room, song);
        res.status(204).end();
    } else {
        res.status(500).end();
    }
});

function emitSongUpdate(room, song) {
    io.to(room.name).emit('songUpdate', song.summarize());
}

function emitSongUploaded(room, song) {
    io.to(room.name).emit('songUploaded', {id: song.id});
}

function emitSongUploadProgress(room, song) {
    io.to(room.name).emit('songUploadProgress', {id: song.id, progress: song.uploadProgress});
}

function onUserRoomJoin(room, user) {
    room.addUser(user);
    user.socket.join(room.name);

    // propogate currently joined users to this room
    for (var i = 0; i < room.users.length; i++) {
        user.socket.emit('newUserJoin', room.users[i].summarize());
    }
    // propogate currently added songs
    for (var i = 0; i < room.songs.length; i++) {
        user.socket.emit('songUpdate', room.songs[i].summarize());
    }
    // inform others of this user's joining
    io.to(room.name).emit('newUserJoin', user.summarize());
}

function onUserRoomQuit(room, user) {
    room.removeUser(user);

    io.to(room.name).emit('userQuit', user.summarize());
}

io.on('connection', function(socket) {
    var joinedRoom;
    var user;

    socket.on('join', function(data) {
        var roomName = data.room;

        // room doesn't exist, nothing to do
        if (!(roomName in app.locals.rooms)) {
            return;
        }

        var room = app.locals.rooms[roomName];
        joinedRoom = room;

        console.log("user joining " + room.name);

        user = new User('Anonymous', socket);

        onUserRoomJoin(room, user);
    });

    socket.on('uploadProgress', function(data) {
        if (!joinedRoom) {
            return;
        }

        console.log(data);

        var song = joinedRoom.findUploadingSongByUploader(socket);
        if (song) {
            song.setProgress(data);
            emitSongUploadProgress(joinedRoom, song);
        }
    });

    socket.on('preUploadMeta', function(data) {
        if (!joinedRoom) {
            socket.emit('uploadDisapproved');
            return;
        }

        var metadata = data.metadata;

        ID3.parse(metadata).then(tag => {
            var artist = tag.artist;
            var album = tag.album;
            var title = tag.title;

            var song = new Song(artist, album, title, data.filename);
            song.setUploader(socket);

            song.updateFromLastFM(function() {
                console.log(song);
                joinedRoom.addSong(song);

                socket.emit('uploadApproved');
                emitSongUpdate(joinedRoom, song);
            });
        });
    });

    socket.on('disconnect', function (data) {
        console.log('user disconnected');

        if (joinedRoom && user) {
            console.log('user leaving room ' + joinedRoom.name);

            onUserRoomQuit(joinedRoom, user);
        }
    });
});

module.exports = router;
module.exports.createNewRoom = createNewRoom;
