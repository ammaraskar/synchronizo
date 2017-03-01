var should = require('should');

describe('music room logic', function() {
    var room;

    beforeEach(function () {
        room = require('../controllers/music_room')
    });

    it('generates unique random names', function testRandomNames() {
        var room1 = room.createNewRoom();
        var room2 = room.createNewRoom();

        room1.name.should.not.eql(room2.name);
    });

    it('runs out of names to generate', function runsOutOfNames() {
        should.throws(function generateLotsOfRooms() {
            for (var i = 0; i < 1000; i++) {
                room.createNewRoom();
            }
        }, function(error) {
            if (error.name === "OutOfNamesError") {
                return true;
            }
        });
    });
});
