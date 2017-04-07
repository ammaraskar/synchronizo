var express = require('express');
var router = express.Router();
var app = require('../server').app;
var DBUser = require('../models/User').DBUser;

router.use('/room', require('./music_room'))
router.use('/api', require('./api'))


router.get('/', function(req, res) {
    var rooms = [];

    for (var room in app.locals.rooms) {
        rooms.push(app.locals.rooms[room]);
    }

    console.log(req.user);
    res.render('public/index.html', {rooms: rooms});
});

router.get('/user/:id', function(req, res) {
    var id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400);
        res.send("User id must be an integer");
        return;
    }

    DBUser.findById(id).then(function(user) {
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
        var lastSong = null;
        if (user.lastSongListened) {
            lastSong = JSON.parse(user.lastSongListened);
        }
        res.render('public/user_profile.html', {
            profile: user,
            joinDate: joinDate,
            lastSong: lastSong,
            isVisible: isVisible
        });
    }).catch(function(error) {
        console.error(error);

        res.status(500);
        res.send("Internal error when retrieving user");
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

    req.user.update({
        bio: bio,
        visibility: visibility
    });
    res.redirect('/user/' + req.user.id);
});

module.exports = router;
