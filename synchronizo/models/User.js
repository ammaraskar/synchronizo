var database = require('../server').database;
var timeSince = require('../helpers/time').timeSince;

function User(username, socket) {
    this.username = username;
    this.socket = socket;
    this.id = -1;
    this.avatar = "http://placehold.it/200x200";
    this.globalId = -1;
}

User.prototype.summarize = function() {
    return {
        'id': this.id,
        'username': this.username,
        'avatar': this.avatar,
        'globalId': this.globalId
    };
}

function SignedInUser(facebookId, displayName, socketioToken) {
    this.facebookId = facebookId;
    this.displayName = displayName;
    this.socketioToken = socketioToken;

    this.id = -1;
    this.bio = "";
    this.visibility = "public";
    this.createdAt = new Date(0);
    this.banned = false;
    this.following = {};
    this.blocked = {};
    this.songHistory = [];
}

SignedInUser.prototype.getLastSongListened = function() {
    if (this.songHistory.length == 0) {
        return null;
    }
    var id = this.songHistory[this.songHistory.length - 1].song;
    return database.songs[id];
}

SignedInUser.prototype.getLastSongs = function() {
    var lastSongs = this.songHistory.slice(-10);
    var songs = [];

    for (var i = lastSongs.length - 1; i >= 0; i--) {
        var song = database.songs[lastSongs[i].song];
        song.timeListened = timeSince(new Date(lastSongs[i].timeListened)) + " ago";

        songs.push(song);
    }

    return songs;
}

SignedInUser.prototype.setId = function(id) {
    this.id = id;
}

SignedInUser.prototype.addListenedSong = function(song) {
    this.songHistory.push({
        timeListened: new Date(),
        song: song.getIdentifier()
    });
}

SignedInUser.prototype.getFollowing = function() {
    var followingUsers = [];
    var following = Object.keys(this.following);
    for (var i = 0; i < following.length; i++) {
        followingUsers.push(SignedInUser.getById(following[i]));
    }
    return followingUsers;
}

SignedInUser.prototype.isFollowing = function(other_id) {
    if (this.following[other_id]) {
        return true;
    } else {
        return false;
    }
}

SignedInUser.prototype.hasBlocked = function(other_id) {
    if (this.blocked[other_id]) {
        return true;
    } else {
        return false;
    }
}

SignedInUser.prototype.isAdmin = function() {
    return database.admins[this.id];
}

SignedInUser.create = function create(facebookId, displayName, socketioToken) {
    var user = new SignedInUser(facebookId, displayName, socketioToken);

    var id = database.users.length;
    user.setId(id);
    user.createdAt = new Date();

    database.users.push(user);
    database.usersByFacebookId[facebookId] = id;

    return user;
}

SignedInUser.getById = function getById(id) {
    if (database.users[id]) {
        return database.users[id];
    } else {
        return null;
    }
}

SignedInUser.getByFacebookId = function getByFacebookId(facebookId) {
    if (database.usersByFacebookId[facebookId]) {
        var id = database.usersByFacebookId[facebookId];
        return database.users[id];
    } else {
        return null;
    }
}

module.exports = User;
module.exports.SignedInUser = SignedInUser;
