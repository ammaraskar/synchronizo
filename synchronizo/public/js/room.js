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

    } else {
        var song = new Song(song);

        var rendered = song.renderSongBox();
        song.setRenderedBox(rendered);

        $("#song-container").append(rendered);

        songs[song.id] = song;
    }
}

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
    this.id = song_json.id;

    this.album = song_json.album;
    this.artist = song_json.artist;
    this.title = song_json.title;
    this.albumArt = song_json.album_art;

    this.uploading = song_json.uploading;
    this.uploadProgress = song_json.uploadProgress;

    this.rendered = $("");
};

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

Song.prototype.renderSongBox = function() {
    var html = $("#songDisplayTemplate").html();
    html = html.replace("{album-art}", this.albumArt);
    html = $(html);

    var _this = this;

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

    return html;
}

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
