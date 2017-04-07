var Sequelize = require('sequelize');
var sequelize = require('../server').sequelize;

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

var DBUser = sequelize.define('user', {
    displayName: Sequelize.STRING,
    facebookId: Sequelize.STRING,
    facebookToken: Sequelize.STRING,

    socketioToken: Sequelize.STRING,

    lastSongListened: Sequelize.TEXT,
    bio: Sequelize.STRING,
    visibility: {
        type: Sequelize.STRING(10),
        defaultValue: "public"
    }
});

module.exports = User;
module.exports.DBUser = DBUser;
