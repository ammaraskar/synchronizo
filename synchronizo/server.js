var fs = require('fs');
var express = require('express');
var nunjucks = require('nunjucks');
var passport = require('passport');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var Strategy = require('passport-facebook').Strategy;
try {
    var config = require('./config');
} catch (e) {
    console.error(e);
    var config;
}

var app = express();
module.exports.app = app;

// Initialize the rooms to be empty
app.locals.rooms = {};
// socket.io auth tokens
app.locals.tokens = {};

var DATABASE_PATH = "testing.db";
if (!fs.existsSync(DATABASE_PATH)) {
    var database = {
        users: [],
        usersByFacebookId: {}
    };
} else {
    var database = JSON.parse(fs.readFileSync(DATABASE_PATH));
}
module.exports.database = database;

var SignedInUser = require('./models/User').SignedInUser;
for (var i = 0; i < database.users.length; i++) {
    database.users[i].__proto__ = SignedInUser.prototype;
}

nunjucks.configure('views', {
    autoescape: true,
    throwOnUndefined: true,
    noCache: true,
    express: app
});

if (config) {
    console.log("Using facebook authentication");

    app.use(require('express-session')({ secret: config.sessionSecret, resave: true, saveUninitialized: true }));

    passport.use(new Strategy({
            clientID: config.facebook.app_id,
            clientSecret: config.facebook.secret,
            callbackURL: config.facebook.callbackURL
        },
        function(accessToken, refreshToken, profile, cb) {
            var socketioToken = crypto.randomBytes(20).toString('hex');
            profile.socketioToken = socketioToken;

            var user = SignedInUser.getByFacebookId(profile.id);
            if (user) {
                // update the existing fields
                user.displayName = profile.displayName;
                user.socketioToken = profile.socketioToken;
            } else {
                user = SignedInUser.create(profile.id, profile.displayName, profile.socketioToken);
            }

            profile.globalId = user.id;
            app.locals.tokens[socketioToken] = profile;

            return cb(null, user);
        }
    ));

    passport.serializeUser(function(user, cb) {
        cb(null, user.id);
    });

    passport.deserializeUser(function(id, cb) {
        cb(null, SignedInUser.getById(id));
    });

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/auth/facebook', passport.authenticate('facebook'));
    app.get('/auth/facebook/callback',
            passport.authenticate('facebook', { failureRedirect: '/authfail' }),
            function(req, res) {
                res.redirect('/');
            }
    );
}

app.use(function(req, res, next){
    res.locals.user = req.user;
    next();
});


// Serve static files from express for now
app.use(express.static('public'));

// parse post request bodies
app.use(bodyParser.urlencoded({ extended: true }));

var server = app.listen(8000, function(){
    console.log("We have started our server on port 8000");
});

// ping every room every 0.5 seconds so they may update their internal
// timers
setInterval(function pingRooms() {
    for (var roomName in app.locals.rooms) {
        app.locals.rooms[roomName].timerPing();
    }
}, 500);

// save the database every 4 seconds
setInterval(function saveDatabase() {
    var json = JSON.stringify(database);
    fs.writeFile(DATABASE_PATH, json, 'utf8', function(err) {
        if (err) {
            console.error(err);
        }
    });
}, 4000);

io = require('socket.io')(server);

// Hook up all the actual routes to the main app
app.use(require('./controllers'));

module.exports = server;
module.exports.io = io;
