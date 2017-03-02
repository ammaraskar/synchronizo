var lastfm = require("../helpers/lastfm");

// Class declaration for a MusicRoom
function MusicRoom(name) {
    this.name = name;
    this.users = [];
    this.songs = [];
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
}

Song.prototype.setUploader = function(uploader) {
    this.uploader = uploader;
}

Song.prototype.setProgress = function(progress) {
    this.uploadProgress = progress;
}

Song.prototype.markUploaded = function() {
    this.uploadProgress = 100;
    this.uploading = false;
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
