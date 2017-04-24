var express = require('express');
var router = express.Router();

var database = require('../server').database;
var SignedInUser = require('../models/User').SignedInUser;

router.get('/', function(req, res) {
    if (!req.user || !req.user.isAdmin()) {
        res.status(403);
        res.send("Not an admin");
        return;
    }

    res.render('admin/home.html');
});

module.exports = router;
