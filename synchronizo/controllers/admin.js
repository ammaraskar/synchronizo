var express = require('express');
var router = express.Router();

var timeSince = require('../helpers/time').timeSince;
var database = require('../server').database;
var SignedInUser = require('../models/User').SignedInUser;

router.get('/', function(req, res) {
    if (!req.user || !req.user.isAdmin()) {
        res.status(403);
        res.send("Not an admin");
        return;
    }

    var log = [];
    var lastLogEntries = database.adminLog.slice(-200);
    for (var i = lastLogEntries.length - 1; i >= 0; i--) {
        var entry = lastLogEntries[i];
        log.push({
            msg: entry.msg,
            time: timeSince(new Date(entry.time))
        });
    }

    var reports = [];
    for (var i = 0; i < database.reports.length; i++) {
        var report = {
            reporter: SignedInUser.getById(database.reports[i].reporter),
            target: SignedInUser.getById(database.reports[i].target),
            message: database.reports[i].message
        }

        reports.push(report);
    }

    res.render('admin/home.html', {log: log, reports: reports});
});

router.get('/reportResolve/:id', function(req, res) {
    if (!req.user || !req.user.isAdmin()) {
        res.status(403);
        res.send("Not an admin");
        return false;
    }

    var id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400);
        res.send("Report id must be an integer");
        return false;
    }

    if (id < 0 || id > database.reports.length - 1) {
        res.status(400);
        res.send("Invalid report id");
        return false;
    }

    database.reports.splice(id, 1);
    res.redirect('/admin');
});

router.get('/users', function(req, res) {
    if (!req.user || !req.user.isAdmin()) {
        res.status(403);
        res.send("Not an admin");
        return;
    }

    res.render('admin/users.html', {users: database.users});
});

function validateIdRoute(req, res) {
    if (!req.user || !req.user.isAdmin()) {
        res.status(403);
        res.send("Not an admin");
        return false;
    }

    var id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400);
        res.send("id must be an integer");
        return false;
    }

    var user = SignedInUser.getById(id);
    if (!user) {
        res.status(400);
        res.send("User not found");
        return false;
    }

    if (user.id == req.user.id) {
        res.status(400);
        res.send("Can't perform actions on yourself");
        return false;
    }

    return true;
}

router.get('/users/ban/:id', function(req, res) {
    if (!validateIdRoute(req, res)) {
        return;
    }

    var user = SignedInUser.getById(req.params.id);
    if (user.banned) {
        user.banned = false;
    } else {
        user.banned = true;
    }

    res.redirect('/admin/users');
});

router.get('/users/adminify/:id', function(req, res) {
    if (!validateIdRoute(req, res)) {
        return;
    }

    var user = SignedInUser.getById(req.params.id);
    if (user.isAdmin()) {
        delete database.admins[user.id];
    } else {
        database.admins[user.id] = true;
    }

    res.redirect('/admin/users');
});

function addToAdminLog(message) {
    database.adminLog.push({
        msg: message,
        time: new Date()
    });
}

module.exports = router;
module.exports.addToAdminLog = addToAdminLog;
