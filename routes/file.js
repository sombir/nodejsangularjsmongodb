var express = require('express');
var router = express.Router();
var multer = require("multer");

var Storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // cb(null, "./src/assets/images/");
        cb(null, "./dist/assets/images");
    },
    filename: function (req, file, cb) {
        cb(null, 'Charter_Communications_Logo.png');
    }
});

var upload = multer({ storage: Storage}).single('file');

/** API path that will upload the files */
router.post('/upload', function(req, res) {
    upload(req, res, function(err){
        if(err){
            return res.status(501).json({error: err});
        }
            res.json({error_code:0,err_desc:null});
    });
});

module.exports = router;