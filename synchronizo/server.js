var express = require('express');
var nunjucks = require('nunjucks');
var passport = require('passport');
var crypto = require('crypto');
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
            profile.socketioToken = crypto.randomBytes(20).toString('hex');
            app.locals.tokens[profile.socketioToken] = profile;
            return cb(null, profile);
        }
    ));

    passport.serializeUser(function(user, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function(obj, cb) {
        cb(null, obj);
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

io = require('socket.io')(server);

// Hook up all the actual routes to the main app
app.use(require('./controllers'));

module.exports = server;
module.exports.io = io;
