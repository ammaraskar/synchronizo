var express = require('express');
var router = express.Router();

var rooms = {};

// Class declaration for a MusicRoom
function MusicRoom(name) {
    this.name = name;
    this.users = [];
}

var prefixes = ['New', 'Big', 'Great', 'Small', 'Bad', 'Real', 'Best', 'Only'];
var suffixes = ['Cat', 'Dog', 'Cheetah', 'Horse', 'Rabbit', 'Hare', 'Owl'];
function generateRandomRoomName() {
    var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    var suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return prefix + suffix;
}

function getUniqueRoomName() {
    var count = 0;
    var name = generateRandomRoomName();
    // ensure this name is not in use
    while (name in rooms) {
        name = generateRandomRoomName();
        count++;

        // We've more than likely ran out of random names that can
        // be created, not much we can do here, so toss an exception
        if (count > (prefixes.length * suffixes.length * 2)) {
            throw {name : "OutOfNamesError", message : "Ran out of random rooms names"};
        }
    }

    return name;
}

function createNewRoom() {
    var name = getUniqueRoomName();
    var room = new MusicRoom(name);
    rooms[name] = room;

    return room;
}

router.get('/create', function(req, res) {
    try {
        var room = createNewRoom();
    } catch (err) {
        if (err.name === "OutOfNamesError") {
            // do something nice
        } else {
            // not our problem lol
            throw err;
        }
    }
});

module.exports = router;
module.exports.createNewRoom = createNewRoom;
