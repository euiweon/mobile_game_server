/**
 * Created by Eui-Weon on 2016. 7. 18..
 */
var express = require('express');
var router = express.Router();


var iap = require('in-app-purchase');
var process_packet = require('./process_packet');
var log_manager = require('./log_manager');

router.get('/', function(req, res) {
    res.send('respond with a resource');
});

/**
 * @apiIgnore Not finished Method
 * @api {get} /inapp/inapp_checker 인앱 체커
 * @apiGroup In app
 * @apiVersion 1.0.0
 * @apiParam {int32} iapplatform  인앱 플랫폼
 */
router.get('/inapp_checker', function(req, res) {

    var result = {};

    var iapplatform = iap.APPLE;
    var is_sandbox = false;
    switch (req.params.iap_platform) {
        case 0:
            iapplatform = iap.APPLE;
            break;
        case 1:
            iapplatform = iap.GOOGLE;
            break;
        case 2:
            iapplatform = iap.WINDOWS;
            break;
        default:
            iapplatform = iap.AMAZON;
            break;
    }
    result.retruncode = 0;
    res.status(200).json(result);
});


module.exports = router;