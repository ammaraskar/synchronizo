// Client side javascript to handle a music room
var socket = io();
var users = {};
var songs = {};

socket.on('connect', function(data) {
    socket.emit('join', {room: ROOM_NAME, authToken: AUTH_TOKEN});
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

    onSongUpdate(data);
});

socket.on('changeSong', function(id) {
    console.log("song changing to " + id);

    onSongChange(id);
});

socket.on('songSeeked', function(progress) {
    console.log("[socket.io] seeking to " + progress);
    wavesurfer.seekDisabled = true;
    wavesurfer.seekTo(progress);
});

socket.on('currentSongPing', function(data) {
    // check if we are within ~10 seconds of the duration on the server side,
    // if not, seek to the duration
    var serverDuration = data.duration;
    var ourDuration = wavesurfer.getCurrentTime();

    if (Math.abs(serverDuration - ourDuration) > 10) {
        console.log("[socket.io] out of sync with server side");
        console.log("[socket.io] seeking to " + data.floatDuration);
        wavesurfer.seekDisabled = true;
        wavesurfer.seekTo(data.floatDuration);
    }
});

var RETRIEVING_ALREADY = false;
function retrieveArtistInfo(artist) {
    if (RETRIEVING_ALREADY) {
        return;
    }

    RETRIEVING_ALREADY = true;

    $("#artist-bio").fadeOut(function() {
        $("#artist-loader").fadeIn(function() {
            $.get("/api/artist_info.json", { artist: artist},
            function(data) {
                if (data.error) {
                    $("#artist-info-name").text(artist);
                    $("#artist-bio").text("Failed to retrieve information");
                    return;
                }

                $("#artist-bio").html(data.bio);
                $("#artist-info-name").text(data.artist);
                $("#artist-image").attr("src", data.image);
            }, "json").always(function() {
                $("#artist-loader").fadeOut(function() {
                    $("#artist-bio").fadeIn();
                });
                RETRIEVING_ALREADY = false;
            });
        });
    });
}

function onNewUserJoin(user) {
    var user = new User(user.id, user.username, user.avatar);

    if (user.id in users) {
        // update the exixting user
        var renderedBox = user.renderUserBox();
        $("#user-" + user.id).replaceWith(renderedBox);
        user.setRenderedBox(renderedBox);
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

function User(id, username, avatar) {
    this.id = id;
    this.username = username;
    this.avatar = avatar;

    this.renderedBox = $("");
}

User.prototype.setRenderedBox = function(renderedBox) {
    this.renderedBox = renderedBox;
};

User.prototype.renderUserBox = function () {
    var html = $($("#userDisplayTemplate").html());
    //set user avatar to whatever
    html.attr("id", "user-" + this.id);
    html.find('.user-avatar').attr('src', this.avatar);
    html.find('.user-name').text(this.username);
    return html;
};

function changeSong(id) {
    socket.emit('clientChangeSong', id);
}

function onSongChange(id) {
    var song = songs[id];

    $(".song.active").removeClass("active");
    song.rendered.addClass("active");

    wavesurfer.load(ROOM_NAME + '/song/' + id);
    retrieveArtistInfo(song.artist);
}

function onSongUpdate(song) {
    if (song.id in songs) {
        var existingSong = songs[song.id];

        existingSong.updateFromJSON(song);
        existingSong.renderIntoDiv(existingSong.rendered);
    } else {
        var song = new Song(song);

        var rendered = song.renderSongBox();
        song.setRenderedBox(rendered);

        $("#song-container").append(rendered);

        songs[song.id] = song;
    }
}

socket.on('playSong', function() {
    wavesurfer.play();
});

socket.on('pauseSong', function() {
    wavesurfer.pause();
});

socket.on('songUploadProgress', function(data) {
    if (!(data.id in songs)) {
        return;
    }

    var song = songs[data.id];
    song.setProgress(song.rendered, data.progress);
});

socket.on('songUploaded', function(data) {
    if (!(data.id in songs)) {
        return;
    }

    var song = songs[data.id];
    song.markUploaded(song.rendered);
});

function Song(song_json) {
    this.updateFromJSON(song_json);

    this.rendered = $("");
};

Song.prototype.updateFromJSON = function(song_json) {
    this.id = song_json.id;

    this.album = song_json.album;
    this.artist = song_json.artist;
    this.title = song_json.title;
    this.albumArt = song_json.album_art;

    this.uploading = song_json.uploading;
    this.uploadProgress = song_json.uploadProgress;
}

Song.prototype.setProgress = function(html, progress) {
    this.uploadProgress = progress;

    html.find('.progress-bar').css('width', this.uploadProgress + '%');
    html.addClass('uploading');
}

Song.prototype.markUploaded = function(html) {
    html.find('.progress').hide();
    html.removeClass('uploading');
}

Song.prototype.setRenderedBox = function(rendered) {
    this.rendered = rendered;
}

Song.prototype.renderIntoDiv = function(html) {
    var _this = this;

    html.find('img').attr('src', this.albumArt);

    html.find('.artist').attr('title', this.artist);
    html.find('.artist a').text(this.artist).click(function(event) {
        event.preventDefault();
        retrieveArtistInfo(_this.artist);
    });
    html.find('.album').text(this.album).attr('title', this.album);
    html.find('.title').text(this.title).attr('title', this.title);

    html.find('.album-art-link').click(function(event) {
        event.preventDefault();
        changeSong(_this.id);
    });

    if (this.uploading) {
        this.setProgress(html, this.uploadProgress);
    } else {
        this.markUploaded(html);
    }
}

Song.prototype.renderSongBox = function() {
    var html = $("#songDisplayTemplate").html();
    html = $(html);

    this.renderIntoDiv(html);
    return html;
}

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  alert('The File APIs are not fully supported in this browser.');
}

function onSendMessage() {
    var input_box = $("#chat-message-input");

    var message = String(input_box.val());
    if (message === "") {
        return;
    }

    // empty out the box
    input_box.val("");

    socket.emit('sendMessage', message);
}

socket.on('onMessage', function(data) {
    console.log('onMessage', data);

    if (data.type == "chat") {
        var user = data.user;
        var message = data.message;

        var renderedMessage = $('<li><b></b> <div class="arrow_box"></div></li>');
        renderedMessage.find('b').text(user);
        renderedMessage.find('.arrow_box').text(message);
    } else if (data.type == "event") {
        var message = data.message;

        var renderedMessage = $("<li></li>");
        renderedMessage.html(message);
        for (var i = 0; i < data.subjects.length; i++) {
            var subject = data.subjects[i];

            renderedMessage.find('b').eq(i).text(subject);
        }
    }

    if (!renderedMessage) {
        return;
    }

    var chat_box = $(".chat-box");
    chat_box.append(renderedMessage);

    if (data.noAnimate) {
        return;
    }

    chat_box.animate({ scrollTop: chat_box[0].scrollHeight }, 'fast');
});

$( document ).ready(function() {
    $("#chat-send-button").click(function() {
        onSendMessage();
    });
    $('#chat-message-input').keypress(function (e) {
        if (e.which == 13) {
            onSendMessage();
            return false;    //<---- Add this line
        }
    });

    $("#upload-button").click(function() {
        $('<input type="file" accept="audio/*">').on('change', function () {
            var file = this.files[0];
            onFileSelect(file);
        }).click();
    });

    var fileToUpload;

    function onFileSelect(file) {
        $("#upload-button").addClass("disabled");
        var blob = file.slice(0, 2048);

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
