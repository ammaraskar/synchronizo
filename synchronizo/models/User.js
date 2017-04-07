var Sequelize = require('sequelize');
var sequelize = require('../server').sequelize;

function User(username, socket) {
    this.username = username;
    this.socket = socket;
    this.id = -1;
    this.avatar = "http://placehold.it/200x200";
}

User.prototype.summarize = function() {
    return {
        'id': this.id,
        'username': this.username,
        'avatar': this.avatar
    };
}

var DBUser = sequelize.define('user', {
    displayName: Sequelize.STRING,
    facebookId: Sequelize.STRING,
    facebookToken: Sequelize.STRING,
    socketioToken: Sequelize.STRING
});

module.exports = User;
module.exports.DBUser = DBUser;
