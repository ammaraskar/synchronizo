var request = require('supertest');
var should = require('should');

describe('login web request', function() {
    var server = require('../server');

    it('redirects you to login screen', function testCreate(done) {
        request(server)
        .get('/login')
        .expect(200, done)
    });
});
