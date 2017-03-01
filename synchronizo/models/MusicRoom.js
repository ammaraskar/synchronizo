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

function getUniqueRoomName(rooms) {
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

function createNewRoom(rooms) {
    var name = getUniqueRoomName(rooms);
    var room = new MusicRoom(name);
    rooms[name] = room;

    return room;
}

module.exports = MusicRoom;
module.exports.createNewRoom = createNewRoom;
