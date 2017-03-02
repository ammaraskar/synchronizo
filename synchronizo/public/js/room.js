// Client side javascript to handle a music room
var socket = io();
var users = [];

socket.on('connect', function(data) {
    socket.emit('join', {'room': ROOM_NAME});
});

socket.on('newUserJoin', function(data) {
    onNewUserJoin(data.username);
});

socket.on('songUpdate', function(data) {
    console.log(data);
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
