var express = require('express');
var router = express.Router();

router.use('/room', require('./music_room'))

router.get('/',function(req, res) {
    res.render('public/index.html');
});

module.exports = router;
