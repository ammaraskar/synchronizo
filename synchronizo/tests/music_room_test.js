var should = require('should');

describe('music room logic', function() {
    var room = require('../controllers/music_room');

    it('generates unique random names', function testRandomNames() {
        var name1 = room.getUniqueRoomName();
        var name2 = room.getUniqueRoomName();

        name1.should.not.eql(name2);
    });

    it('fails a test case', function testFailingCase() {
        var name1 = room.getUniqueRoomName();

        name1.should.not.eql(name1);
    });
});
