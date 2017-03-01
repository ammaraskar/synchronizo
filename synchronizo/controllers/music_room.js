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
        if (count > 50) {
            throw Error('Ran out of random room names to generate');
        }
    }

    return name;
}

router.get('/create', function(req, res) {

});

module.exports = router;
module.exports.getUniqueRoomName = getUniqueRoomName;
