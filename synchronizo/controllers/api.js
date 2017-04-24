var lastfm = require("../helpers/lastfm");
var express = require('express');
var router = express.Router();

var database = require('../server').database;
var SignedInUser = require('../models/User').SignedInUser;


router.get('/artist_info.json', function(req, res) {
    var artist = req.query.artist;

    lastfm.getAristInfo(artist, function(err, artist_info) {
        if (err) {
            res.json({error: true, error_message: "Error retrieving artist info"});
            return;
        }

        res.json(artist_info);
    });
});

router.get('/taste/:id.json', function(req, res) {
    var id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400);
        res.send("Song id must be an integer");
        return false;
    }

    var user = SignedInUser.getById(id);
    if (!user) {
        res.status(400);
        res.send("User not found");
        return false;
    }

    var tagCounts = {};
    for (var i = 0; i < user.songHistory.length; i++) {
        var song = database.songs[user.songHistory[i].song];

        if (!song.tags) {
            continue;
        }

        for (var j = 0; j < song.tags.length; j++) {
            var tag = song.tags[j];
            if (tagCounts[tag]) {
                tagCounts[tag] += 1;
            } else {
                tagCounts[tag] = 1;
            }
        }
    }

    var topTags = [];
    for (var tag in tagCounts) {
        if (tagCounts.hasOwnProperty(tag)) {
            topTags.push({
                tag: tag,
                count: tagCounts[tag]
            });
        }
    }

    topTags.sort(function(a, b) {
        return b.count - a.count;
    });

    var tags = [];
    for (var i = 0; i < topTags.length; i++) {
        tags.push(topTags[i].tag);
    }

    res.json(tags);
});


module.exports = router;
