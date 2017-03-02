// Client side javascript to handle a music room
var socket = io();
var users = [];

socket.on('connect', function(data) {
    socket.emit('join', {'room': ROOM_NAME});
});

socket.on('newUserJoin', function(data) {
    onNewUserJoin(data.username);
});

function onNewUserJoin(username) {
    var user = new User(username);
    users.push(user);

    $("#user-list").append(user.renderUserBox());
}

function onUserQuit(username) {
    var index = array.indexOf(username);

    var user = users[index];
    users.splice(index, 1);
}

function User(username) {
    this.username = username;
}

User.prototype.renderUserBox = function () {
    var html = $($("#userDisplayTemplate").html());
    //set user avatar to whatever
    //html.find('.user-avatar').
    html.find('.user-name').text(this.username);
    return html;
};
