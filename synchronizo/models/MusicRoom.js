var LastfmAPI = require('lastfmapi');
try {
    var config = require('../config');

    var lfm = new LastfmAPI({
        'api_key' : config.lastfm.api_key,
        'secret' : config.lastfm.secret
    });
} catch (e) {
    var lfm;
}

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
        artist: this.artist,
        album: this.album,
        title: this.title,
        album_art: this.album_art,
        uploading: this.uploading,
        uploadProgress: this.uploadProgress
    };
}

Song.prototype.updateFromLastFM = function(callback) {
    // if we don't have access to the lastfm api then we can't do much
    if (!lfm) {
        console.log("No last.fm");
        callback();
        return;
    }

    // without at least this information we can't search for this track
    if (!this.artist && !this.title) {
        console.log("No artist and title info");
        callback();
        return;
    }

    var params = {
        limt: 1,
        track: this.title,
        artist: this.artist
    }
    if (this.album) {
        params.album = this.album;
    }

    var _song = this;
    lfm.track.search(params, function(err, result) {
        if (err) {
            console.error(err);
            callback();
            return;
        }

        if (!result.trackmatches) {
            callback();
            return;
        }

        if (result.trackmatches.track.length <= 0) {
            callback();
            return;
        }

        var track = result.trackmatches.track[0];
        console.log(track);

        if (track.name) {
            _song.title = track.name;
        }
        if (track.artist) {
            _song.artist = track.artist;
        }
        if (track.album) {
            _song.album = track.album;
        }

        if (track.image) {
            var album_art_found = false;

            // First try to find an extralarge image
            for (var i = 0; i < track.image.length; i++) {
                var image = track.image[i];
                if (image.size === 'extralarge') {
                    album_art_found = true;
                    _song.album_art = image["#text"];
                    break;
                }
            }

            // if not, anything will do
            if (!album_art_found) {
                for (var i = 0; i < track.image.length; i++) {
                    var image = track.image[i];
                    _song.album_art = image["#text"];
                    break;
                }
            }
        }

        callback();
    });
}

module.exports = MusicRoom;
module.exports.Song = Song;
module.exports.createNewRoom = createNewRoom;
