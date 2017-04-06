var lastfm = require("../helpers/lastfm");
var fs = require('fs');
var mm = require('musicmetadata');


// Class declaration for a MusicRoom
function MusicRoom(name) {
    this.name = name;
    this.users = [];
    this.songs = [];

    this.messages = [];

    this.currentlyPlayingSong = -1;
    this.currentSongTimestamp = -1;
    this.lastPing = -1;
    this.paused = false;
}

MusicRoom.prototype.timerPing = function() {
    if (this.lastPing == -1) {
        this.lastPing = Date.now();
        return;
    }
    if (this.currentlyPlayingSong == -1) {
        return;
    }
    if (this.currentSongTimestamp == -1) {
        return;
    }
    if (this.paused) {
        return;
    }

    var elapsed = Date.now() - this.lastPing;

    // move the currentSongTimestamp forward by elapsed time
    var elapsedSeconds = elapsed * 1.0 / 1000;
    this.currentSongTimestamp += elapsedSeconds;

    if (this.currentSongTimestamp >= this.songs[this.currentlyPlayingSong].duration) {
        // is there a next song? if so, play it, else stop playing.
        if (this.currentlyPlayingSong + 1 == this.songs.length) {
            this.currentSongTimestamp = -1;
        } else {
            this.changeSong(this.currentlyPlayingSong + 1);
        }
    }

    // broadcast current song and its timestamp so clients may
    // keep themselves in sync
    if (this.io) {
        var currentSong = this.songs[this.currentlyPlayingSong];
        this.io.to(this.name).emit('currentSongPing', {
            songId: this.currentlyPlayingSong,
            duration: this.currentSongTimestamp,
            floatDuration: this.currentSongTimestamp * 1.0 / currentSong.duration
        });
    }

    this.lastPing = Date.now();
}

MusicRoom.prototype.messageSent = function(user, message) {
    if (typeof message != 'string') {
        return;
    }

    if (message.length > 150) {
        return;
    }

    data = {
        type: 'chat',
        user: user.username,
        message: message
    };
    this.broadcastChatMessage(data);
}

MusicRoom.prototype.broadcastChatMessage = function(message) {
    this.messages.push(message);
    if (this.io) {
        this.io.to(this.name).emit('onMessage', message);
    }
};

MusicRoom.prototype.playSong = function(user) {
    if (this.io) {
        this.io.to(this.name).emit('playSong');
    }
}

MusicRoom.prototype.pauseSong = function(user) {
    if (this.io) {
        this.io.to(this.name).emit('pauseSong');
    }
}

MusicRoom.prototype.previousSong = function(user) {
    if (this.currentlyPlayingSong <= 0) {
        return;
    }

    this.changeSong(this.currentlyPlayingSong - 1);
}

MusicRoom.prototype.nextSong = function(user) {
    if (this.currentlyPlayingSong == this.songs.length - 1) {
        return;
    }

    this.changeSong(this.currentlyPlayingSong + 1);
}

MusicRoom.prototype.validateSongInRoom = function(song) {
    for (var i = 0; i < this.songs.length; i++) {
        if (this.songs[i] == song) {
            return true;
        }
    }

    throw new Error("song not in music room!");
}

MusicRoom.prototype.onSongUpload = function(song) {
    this.validateSongInRoom(song);

    // if this is the first song uploaded, make it play
    if (this.currentlyPlayingSong == -1) {
        var id = song.id;
        this.changeSong(id);
    }
}

MusicRoom.prototype.seekSong = function(user, progress) {
    if (this.currentlyPlayingSong == -1) {
        return;
    }

    if (progress < 0 || progress > 1) {
        return;
    }

    var currentSong = this.songs[this.currentlyPlayingSong];
    this.currentSongTimestamp = progress * currentSong.duration;

    if (this.io) {
        var progressFloat = this.currentSongTimestamp * 1.0 / currentSong.duration;
        this.io.to(this.name).emit('songSeeked', progressFloat);
    }
}

MusicRoom.prototype.changeSong = function(id) {
    if (id < 0 || id >= this.songs.length) {
        throw new Error("changing song to invalid index");
    }

    this.currentlyPlayingSong = id;
    this.currentSongTimestamp = 0;

    this.broadcastChatMessage({
        type: 'event',
        message: "Song changed to <b></b>",
        subjects: [this.songs[id].title]
    });

    if (this.io) {
        this.io.to(this.name).emit('changeSong', id);
    }
}

MusicRoom.prototype.addSong = function(user, song) {
    var id = this.songs.length;

    if (song.title) {
        this.broadcastChatMessage({
            type: 'event',
            message: "<b></b> is uploading <b></b>",
            subjects: [user.username, song.title]
        });
    }

    song.id = id;
    this.songs.push(song);
}

MusicRoom.prototype.addUser = function(user) {
    var id = this.users.length;

    this.broadcastChatMessage({
        type: 'event',
        message: "<b></b> joined the room",
        subjects: [user.username]
    });

    user.id = id;
    this.users.push(user);
}

MusicRoom.prototype.removeUser = function(user) {
    var id = user.id;

    this.broadcastChatMessage({
        type: 'event',
        message: "<b></b> left the room",
        subjects: [user.username]
    });

    this.users.splice(id, 1);
}

MusicRoom.prototype.findUploadingSongByUploader = function(uploader) {
    for (var i = this.songs.length - 1; i >= 0; i--) {
        var song = this.songs[i];
        if (song.uploading && song.uploader == uploader) {
            return song;
        }
    }

    return null;
}

MusicRoom.prototype.findUploadingSong = function(filename) {
    for (var i = this.songs.length - 1; i >= 0; i--) {
        var song = this.songs[i];
        if (song.uploading && song.filename == filename) {
            return song;
        }
    }

    return null;
}

var prefixes = ['New', 'Big', 'Great', 'Small', 'Bad', 'Real', 'Best', 'Only'];
var suffixes = ['Cat', 'Dog', 'Cheetah', 'Horse', 'Rabbit', 'Hare', 'Owl'];
function generateRandomRoomName() {
    var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    var suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return prefix + suffix;
}

function getUniqueRoomName(rooms) {
    var count = 0;
    var name = generateRandomRoomName();
    // ensure this name is not in use
    while (name in rooms) {
        name = generateRandomRoomName();
        count++;

        // We've more than likely ran out of random names that can
        // be created, not much we can do here, so toss an exception
        if (count > (prefixes.length * suffixes.length * 2)) {
            throw {name : "OutOfNamesError", message : "Ran out of random rooms names"};
        }
    }

    return name;
}

function createNewRoom(rooms) {
    var name = getUniqueRoomName(rooms);
    var room = new MusicRoom(name);
    rooms[name] = room;

    return room;
}



function Song(artist, album, title, filename) {
    this.id = -1;

    this.artist = artist;
    this.album = album;
    this.title = title;
    this.filename = filename;

    this.album_art = "/images/unknown_album.png";

    this.uploading = true;
    this.uploadProgress = 0;

    this.duration = 0;
}

Song.prototype.setUploader = function(uploader) {
    this.uploader = uploader;
}

Song.prototype.setProgress = function(progress) {
    this.uploadProgress = progress;
}

Song.prototype.setUploadedFile = function(uploadedFile, callback) {
    this.uploadedFile = uploadedFile;
    this.uploading = false;
    this.uploadProgress = 100;

    var _this = this;

    var readableStream = fs.createReadStream(uploadedFile);
    var parser = mm(readableStream, { duration: true }, function (err, metadata) {
        if (err) {
            callback(err);
            console.err(err);
        }

        console.log(metadata);
        if (metadata.duration) {
            _this.duration = metadata.duration;
        }

        // see if we have any new information about the artist, song, album etc
        if (metadata.title && !_this.title) {
            _this.title = metadata.title;
        }
        if (metadata.album && !_this.album) {
            _this.album = metadata.album;
        }
        if (metadata.artist.length > 0 && !_this.artist) {
            _this.artist = metadata.artist[0];
        }

        readableStream.close();
        callback(null);
        _this.updateFromLastFM(function() {
            // update info from last.fm in case we picked up any new
            // metadata from reading the full file. But do this outside
            // the callback, this means that old clients won't get the
            // newly updated info but anyone new connecting to the room
            // will.
        });
    });
}

Song.prototype.summarize = function() {
    return {
        id: this.id,
        artist: this.artist || "Unknown",
        album: this.album || "Unknown",
        title: this.title || "Unknown",
        album_art: this.album_art,
        uploading: this.uploading,
        uploadProgress: this.uploadProgress
    };
}

Song.prototype.updateFromLastFM = function(callback) {
    lastfm.updateSongFromLastFM(this, callback);
}

module.exports = MusicRoom;
module.exports.Song = Song;
module.exports.createNewRoom = createNewRoom;
