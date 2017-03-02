var request = require('supertest');
var should = require('should');

describe('loading express', function () {
    var server;
    beforeEach(function () {
        server = require('../server');
    });
    afterEach(function () {
        server.close();
    });
    it('responds to /', function testSlash(done) {
        request(server)
        .get('/')
        .expect(200, done);
    });
    it('shows music room on index page', function roomOnIndex(done) {
        request(server)
        .get('/room/create')
        .end(function(err, res) {
            if (err) done(err);

            var url = res.header['location'];
            var lastSlash = url.lastIndexOf('/');
            var roomName = url.substring(lastSlash + 1);

            request(server)
            .get('/')
            .expect(200)
            .expect(function(res) {
                if (res.text.indexOf(roomName) == -1) {
                    throw new Error("Newly added music room not listed on index page");
                }
            })
            .end(done);
        });
    });

});
