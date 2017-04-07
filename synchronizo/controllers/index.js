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

        res.render('public/user_profile.html', {profile: user});
    }).catch(function(error) {
        console.error(error);

        res.status(500);
        res.send("Internal error when retrieving user");
    });
});

module.exports = router;
