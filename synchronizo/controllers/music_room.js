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
    room.io = io;

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
});

router.get('/:roomName/song/:id', function(req, res) {
    var name = req.params.roomName;

    if (!(name in app.locals.rooms)) {
        res.status(404);
        res.send("Room not found");
        return;
    }

    var id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400);
        res.send("Song id must be an integer");
        return;
    }

    var room = app.locals.rooms[name];

    if (id < 0 || id >= room.songs.length) {
        res.status(400);
        res.send("Invalid song id, must be an uploaded song index");
    }

    var song = room.songs[id];
    res.download(song.uploadedFile);
});

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
    var saved_file = req.file.path;

    var song = room.findUploadingSong(filename);
    if (song) {
        song.setUploadedFile(saved_file, function(err) {
            if (err) {
                res.status(500).end();
                return;
            }

            emitSongUploaded(room, song);
            room.onSongUpload(song);

            console.log("Uploaded song", song);

            res.status(204).end();
        });
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
    // propogate last 100 messages
    for (var i = 0; i < room.messages.length; i++) {
        var message = room.messages[i];
        // avoid animating every message except the last
        // to prevent animating a lot for existing messages
        if (i != room.messages.length - 1) {
            message.noAnimate = true;
        }
        user.socket.emit('onMessage', room.messages[i]);
    }
    // propogate currently added songs
    for (var i = 0; i < room.songs.length; i++) {
        user.socket.emit('songUpdate', room.songs[i].summarize());
    }
    // tell the client the currently playing song
    if (room.currentlyPlayingSong != -1) {
        user.socket.emit('changeSong', room.currentlyPlayingSong);
    }
    // inform others of this user's joining
    io.to(room.name).emit('newUserJoin', user.summarize());
}

function onUserRoomQuit(room, user) {
    room.removeUser(user);

    io.to(room.name).emit('userQuit', user.summarize());
}

function getUser(authToken, socket) {
    if (!authToken) {
        return new User('Anonymous', socket);
    }

    var profile = app.locals.tokens[authToken];
    if (!profile) {
        return new User('Anonymous', socket);
    }

    var user = new User(profile.displayName, socket);
    user.avatar = "https://graph.facebook.com/" + profile.id + "/picture?type=large";
    return user;
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

        user = getUser(data.authToken, socket);

        console.log(user.username + " joining " + room.name);
        onUserRoomJoin(room, user);
    });

    socket.on('sendMessage', function(message) {
        if (!joinedRoom) {
            return;
        }

        joinedRoom.messageSent(user, message);
    });

    socket.on('playSong', function() {
        if (!joinedRoom) {
            return;
        }
        joinedRoom.playSong(user);
    });

    socket.on('pauseSong', function() {
        if (!joinedRoom) {
            return;
        }
        joinedRoom.pauseSong(user);
    });

    socket.on('nextSong', function() {
        if (!joinedRoom) {
            return;
        }
        joinedRoom.nextSong(user);
    });

    socket.on('previousSong', function() {
        if (!joinedRoom) {
            return;
        }
        joinedRoom.previousSong(user);
    });

    socket.on('clientChangeSong', function(id) {
        if (!joinedRoom) {
            return;
        }

        joinedRoom.changeSong(id);
    });

    socket.on('seekSong', function(data) {
        if (!joinedRoom) {
            return;
        }

        joinedRoom.seekSong(user, data.progress);
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
                console.log(user.name + " uploading ", song.summarize());
                joinedRoom.addSong(user, song);

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
