var request = require('supertest');
var should = require('should');

describe('music room logic', function() {
    var room;

    beforeEach(function () {
        room = require('../controllers/music_room');
    });

    it('generates unique random names', function testRandomNames() {
        var existing = {};

        var room1 = room.createNewRoom(existing);
        var room2 = room.createNewRoom(existing);

        room1.name.should.not.eql(room2.name);
    });

    it('runs out of names to generate', function runsOutOfNames() {
        var existing = {};

        should.throws(function generateLotsOfRooms() {
            for (var i = 0; i < 1000; i++) {
                room.createNewRoom(existing);
            }
        }, function(error) {
            if (error.name === "OutOfNamesError") {
                return true;
            }
        });
    });
});

describe('music room web requests', function() {
    var server = require('../server');

    it('redirects you to a room when you create one', function testCreate(done) {
        request(server)
        .get('/room/create')
        .expect(302, done)
    });

    it('returns a good response on a valid room name', function validRoom(done) {
        request(server)
        .get('/room/create')
        .end(function(err, res) {
            if (err) done(err);

            var url = res.header['location'];
            var lastSlash = url.lastIndexOf('/');
            var roomName = url.substring(lastSlash + 1);

            request(server)
            .get('/room/' + roomName)
            .expect(200, done);
        });
    });

    it('404s on an invalid room name', function testInvalidRoom(done) {
        request(server)
        .get('/room/asdadfasdfasdf')
        .expect(404, done)
    });
});
