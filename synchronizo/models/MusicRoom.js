var lastfm = require("../helpers/lastfm");
var fs = require('fs');
var mm = require('musicmetadata');


// Class declaration for a MusicRoom
function MusicRoom(name) {
    this.name = name;
    this.users = [];
    this.songs = [];

    this.currentlyPlayingSong = -1;
    this.currentSongTimestamp = -1;
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

MusicRoom.prototype.changeSong = function(id) {
    if (id < 0 || id >= this.songs.length) {
        throw new Error("changing song to invalid index");
    }

    this.currentlyPlayingSong = id;
    this.currentSongTimestamp = 0;

    if (this.io) {
        this.io.to(this.name).emit('changeSong', id);
    }
}

MusicRoom.prototype.addSong = function(song) {
    var id = this.songs.length;

    song.id = id;
    this.songs.push(song);
}

MusicRoom.prototype.addUser = function(user) {
    var id = this.users.length;

    user.id = id;
    this.users.push(user);
}

MusicRoom.prototype.removeUser = function(user) {
    var id = user.id;

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
