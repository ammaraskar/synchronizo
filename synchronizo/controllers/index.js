var express = require('express');
var router = express.Router();
var app = require('../server').app;
var database = require('../server').database;
var SignedInUser = require('../models/User').SignedInUser;

router.use('/room', require('./music_room'))
router.use('/api', require('./api'))


router.get('/', function(req, res) {
    var rooms = [];

    for (var room in app.locals.rooms) {
        rooms.push(app.locals.rooms[room]);
    }

    res.render('public/index.html', {rooms: rooms});
});

router.get('/stats', function(req, res) {
    var sortedByPlays = [];

    for (song in database.songs) {
        if (database.songs.hasOwnProperty(song)) {
            sortedByPlays.push(database.songs[song]);
        }
    }

    sortedByPlays.sort(function(a, b) {
        return b.listenCount - a.listenCount;
    });

    res.render('public/stats.html', {songs: sortedByPlays});
});

router.get('/user/:id', function(req, res) {
    var id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400);
        res.send("User id must be an integer");
        return;
    }

    var user = SignedInUser.getById(id);
    if (!user) {
        res.status(404);
        res.send("User not found");
        return;
    }

    var isVisible = false;
    if (user.visibility == "public") {
        isVisible = true;
    } else if (user.visibility == "friends") {
        isVisible = true;
    } else if (user.visibility == "private") {
        if (req.user && req.user.id == user.id) {
            isVisible = true;
        }
    }

    var joinDate = new Date(user.createdAt).toLocaleString();
    var lastSong = user.getLastSongListened();
    res.render('public/user_profile.html', {
        profile: user,
        joinDate: joinDate,
        lastSong: lastSong,
        isVisible: isVisible
    });
});

router.post('/user/edit_profile', function(req, res) {
    if (!req.user) {
        res.status(400);
        res.send("Not logged in");
        return;
    }
    if (!req.body.bio || !req.body.visibility) {
        res.status(400);
        res.send("All parameters not supplied");
        return;
    }

    var bio = req.body.bio;
    if (bio.length > 200) {
        res.status(400);
        res.send("Bio must not exceed 200 characters");
        return;
    }

    var visibility = req.body.visibility;
    if (visibility != "public" && visibility != "friends" && visibility != "private") {
        res.status(400);
        res.send("Visibility must be public/friends/private");
        return;
    }

    req.user.bio = bio;
    req.user.visibility = visibility;

    res.redirect('/user/' + req.user.id);
});

router.post('/user/follow', function(req, res) {
    if (!req.user) {
        res.status(400);
        res.send("Not logged in");
        return;
    }
    if (!req.body.user_id) {
        res.status(400);
        res.send("User id to follow not specified");
        return;
    }

    var id = parseInt(req.body.user_id);
    if (id == NaN) {
        res.status(400);
        res.send("User id must be a number");
        return;
    }

    if (id == req.user.id) {
        res.status(400);
        res.send("Can't follow yourself");
        return;
    }

    var userToFollow = SignedInUser.getById(id);
    if (!userToFollow) {
        res.status(400);
        res.send("user with id " + id + " not found");
        return;
    }

    if (req.user.following[id]) {
        delete req.user.following[id];
    } else {
        req.user.following[id] = true;
    }

    res.redirect('/user/' + id);
});

module.exports = router;
