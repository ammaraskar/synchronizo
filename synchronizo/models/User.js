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

module.exports = User;
