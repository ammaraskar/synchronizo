var express = require('express');
var router = express.Router();
var app = require('../server').app;
var database = require('../server').database;
var SignedInUser = require('../models/User').SignedInUser;

router.use('/room', require('./music_room'));
router.use('/api', require('./api'));
router.use('/admin', require('./admin'));


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

io.on('connection', function(socket) {
    var user = null;

    socket.on('joinMessages', function(data) {
        var profile = app.locals.tokens[data.authToken];
        if (!profile) {
            socket.disconnect();
            return;
        }

        user = SignedInUser.getById(profile.globalId);
        socket.join(user.id);
    });

    socket.on('switchConvo', function(user_id, fn) {
        if (!user) {
            return;
        }

        var conversation = user.getOrStartConversationWith(user_id);
        if (!conversation) {
            return;
        }
        fn(conversation.messages);
    });

    socket.on('sendConvoMessage', function(data) {
        console.log('sendConvoMessage');
        console.log(data);
        if (!user || !data.user_id || !data.message) {
            return;
        }

        var conversation = user.getOrStartConversationWith(data.user_id);
        if (!conversation) {
            return;
        }

        var message = {
            sender: user.id,
            user: user.displayName,
            text: data.message,
            type: "text"
        };
        conversation.messages.push(message);

        io.to(conversation.user1).emit('newConvoMessage', message);
        io.to(conversation.user2).emit('newConvoMessage', message);
    });
});

router.get('/messages', function(req, res) {
    if (!req.user) {
        res.status(402);
        res.send("Not logged in");
        return;
    }

    res.render('public/messages.html');
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

    if (req.user && user.hasBlocked(req.user.id)) {
        isVisible = false;
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

function validateIdRoute(req, res) {
    if (!req.user) {
        res.status(400);
        res.send("Not logged in");
        return false;
    }
    if (!req.body.user_id) {
        res.status(400);
        res.send("User id not specified");
        return false;
    }

    var id = parseInt(req.body.user_id);
    if (id == NaN) {
        res.status(400);
        res.send("User id must be a number");
        return false;
    }

    if (id == req.user.id) {
        res.status(400);
        res.send("User id can't be yourself");
        return false;
    }

    var user = SignedInUser.getById(id);
    if (!user) {
        res.status(400);
        res.send("user with id " + id + " not found");
        return false;
    }

    return true;
}

router.post('/user/follow', function(req, res) {
    if (!validateIdRoute(req, res)) {
        return;
    }

    var id = parseInt(req.body.user_id);
    var userToFollow = SignedInUser.getById(id);

    if (req.user.following[id]) {
        delete req.user.following[id];
    } else {
        req.user.following[id] = true;
    }

    res.redirect('/user/' + id);
});

router.post('/user/block', function(req, res) {
    if (!validateIdRoute(req, res)) {
        return;
    }

    var id = parseInt(req.body.user_id);
    var user = SignedInUser.getById(id);

    if (req.user.hasBlocked(user.id)) {
        delete req.user.blocked[id];
    } else {
        req.user.blocked[id] = true;
    }

    res.redirect('/user/' + id);
});

router.post('/user/report', function(req, res) {
    if (!validateIdRoute(req, res)) {
        return;
    }

    var id = parseInt(req.body.user_id);
    var user = SignedInUser.getById(id);

    if (!req.body.report_message) {
        res.status(400);
        res.send("Report message not specified");
        return;
    }
    var reportMessage = req.body.report_message;
    if (reportMessage.length > 500) {
        res.status(400);
        res.send("Report message too long, max: 500 chars");
        return;
    }

    var report = {
        reporter: req.user.id,
        target: id,
        time: new Date(),
        message: reportMessage
    };
    database.reports.push(report);
    res.redirect('/user/' + id);
});

module.exports = router;
