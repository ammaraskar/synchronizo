// Client side javascript to handle a music room
var socket = io();
var users = {};

socket.on('connect', function(data) {
    socket.emit('join', {'room': ROOM_NAME});
});

socket.on('newUserJoin', function(data) {
    console.log('newUserJoin');
    console.log(data);

    onNewUserJoin(data);
});

socket.on('userQuit', function(data) {
    console.log('userQuit');
    console.log(data);

    onUserQuit(data);
});

socket.on('songUpdate', function(data) {
    console.log('songUpdate');
    console.log(data);
});

function onNewUserJoin(user) {
    var user = new User(user.id, user.username);

    if (user.id in users) {
        // update the exixting user
    } else {
        users[user.id] = user;
        var renderedBox = user.renderUserBox();
        $("#user-list").append(renderedBox);
        user.setRenderedBox(renderedBox);
    }
}

function onUserQuit(user) {
    var user = users[user.id];
    user.renderedBox.remove();
    delete users[user.id];
}

function User(id, username) {
    this.id = id;
    this.username = username;

    this.renderedBox = $("");
}

User.prototype.setRenderedBox = function(renderedBox) {
    this.renderedBox = renderedBox;
};

User.prototype.renderUserBox = function () {
    var html = $($("#userDisplayTemplate").html());
    //set user avatar to whatever
    //html.find('.user-avatar').
    html.find('.user-name').text(this.username);
    return html;
};

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  alert('The File APIs are not fully supported in this browser.');
}

$( document ).ready(function() {
    $("#upload-button").click(function() {
        $('<input type="file" accept="audio/*">').on('change', function () {
            var file = this.files[0];
            onFileSelect(file);
        }).click();
    });

    var fileToUpload;

    function onFileSelect(file) {
        $("#upload-button").addClass("disabled");
        var blob = file.slice(0, 1023);

        socket.emit('preUploadMeta', {filename: file.name, metadata: blob});

        fileToUpload = file;
    }

    socket.on('uploadApproved', function() {
        if (fileToUpload) {
            console.log("Upload approved");

            var xhr = new XMLHttpRequest();

            if (xhr.upload) {
                xhr.upload.onprogress = onProgress;
            }
            xhr.onreadystatechange = function(e) {
                if (this.readyState == 4) {
                    $("#upload-button").removeClass("disabled");
                }
            };

            xhr.open('POST', ROOM_NAME + "/upload", true);

            var formData = new FormData();
            formData.append("song", fileToUpload);
            xhr.send(formData);
        }
    });

    function onProgress(e) {
        var done = e.position || e.loaded, total = e.totalSize || e.total;
        var percentage = Math.floor(done/total*1000)/10;

        socket.emit('uploadProgress', percentage);
    }

    socket.on('uploadDisapproved', function() {
        $("#upload-button").removeClass("disabled");

        var error = $("#error");
        error.fadeIn('slow', function() {
            error.fadeOut('slow');
        })
    });
});
