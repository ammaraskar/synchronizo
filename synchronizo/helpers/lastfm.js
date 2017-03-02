// This file deals with all interactions with the LastFM API
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

function updateSongFromLastFM(_song, callback) {
    // if we don't have access to the lastfm api then we can't do much
    if (!lfm) {
        console.log("No last.fm");
        callback();
        return;
    }

    // without at least this information we can't search for this track
    if (!_song.artist && !_song.title) {
        console.log("No artist and title info");
        callback();
        return;
    }

    var params = {
        limt: 1,
        track: _song.title,
        artist: _song.artist
    }
    if (_song.album) {
        params.album = _song.album;
    }

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

module.exports.updateSongFromLastFM = updateSongFromLastFM;
