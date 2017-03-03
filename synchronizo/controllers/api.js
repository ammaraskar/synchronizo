var lastfm = require("../helpers/lastfm");
var express = require('express');
var router = express.Router();


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


module.exports = router;
