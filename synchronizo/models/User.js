function User(username, socket) {
    this.username = username;
    this.socket = socket;
    this.id = -1;
}

User.prototype.summarize = function() {
    return {
        'id': this.id,
        'username': this.username
    };
}

module.exports = User;
