var database = require('../server').database;

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
    this.lastSongListened = null;
    this.followers = {};
}

SignedInUser.prototype.setId = function(id) {
    this.id = id;
}

SignedInUser.prototype.isFollowing = function(other_id) {
    if (this.following[other_id]) {
        return true;
    } else {
        return false;
    }
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
