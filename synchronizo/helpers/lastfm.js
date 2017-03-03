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


/* An example of the structure last.fm returns for images
[ { '#text': 'https://lastfm-img2.akamaized.net/i/u/34s/67008dbfc8b0f6f44f601f26a19e6d07.png',
    size: 'small' },
  { '#text': 'https://lastfm-img2.akamaized.net/i/u/64s/67008dbfc8b0f6f44f601f26a19e6d07.png',
    size: 'medium' },
  { '#text': 'https://lastfm-img2.akamaized.net/i/u/174s/67008dbfc8b0f6f44f601f26a19e6d07.png',
    size: 'large' },
  { '#text': 'https://lastfm-img2.akamaized.net/i/u/300x300/67008dbfc8b0f6f44f601f26a19e6d07.png',
    size: 'extralarge' },
  { '#text': 'https://lastfm-img2.akamaized.net/i/u/67008dbfc8b0f6f44f601f26a19e6d07.png',
    size: 'mega' },
  { '#text': 'https://lastfm-img2.akamaized.net/i/u/arQ/67008dbfc8b0f6f44f601f26a19e6d07.png',
    size: '' } ]
*/
var order = ["mega", "extralarge", "large", "medium", "small"];
function pickLargestImage(images) {
    var images_per_size = {};

    for (var i = 0; i < images.length; i++) {
        var size = images[i].size;
        images_per_size[size] = images[i]["#text"];
    }

    // now that we have them ordered per size, pick out the best one we can
    for (var i = 0; i < order.length; i++) {
        if (order[i] in images_per_size) {
            return images_per_size[order[i]];
        }
    }

    // no images?
    return "404.png";
}

function getAlbumInfo(song, callback) {
    var params = {
        artist: song.artist,
        album: song.album,
        autocorrect: 1
    }

    lfm.album.getInfo(params, function(err, res) {
        if (err) {
            console.error(err);
            callback();
            return;
        }

        song.album = res.name;
        song.album_art = pickLargestImage(res.image);
        callback();
    });
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

    // if we have album information, prefer to retrieve album art from there
    if (_song.album) {
        getAlbumInfo(_song, callback);
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
            _song.album_art = pickLargestImage(track.image);
        }

        callback();
    });
}

var artist_info_cache = {};

function getAristInfo(artist, callback) {
    if (artist in artist_info_cache) {
        callback(null, artist_info_cache[artist]);
        return;
    }

    lfm.artist.getInfo({artist: artist, autocorrect: 1}, function(err, res) {
        if (err) {
            callback(err, null);
            return;
        }

        var corrected_artist = res.name;
        var bio = res.bio.summary || "";
        var image = pickLargestImage(res.image);

        var response = {
            error: false,
            artist: corrected_artist,
            bio: bio,
            image: image
        };

        artist_info_cache[artist] = response;
        artist_info_cache[corrected_artist] = response;

        callback(null, response);
    });
}

module.exports.updateSongFromLastFM = updateSongFromLastFM;
module.exports.getAristInfo = getAristInfo;
