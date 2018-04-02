var express = require('express');
var router = express.Router();

var process_packet = require('./process_packet');
var mysqlconnection = require('./mysqlconnection');
var log_manager = require('./log_manager');

router.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
});



/**
 * @api {post} /hash_check 안드로이드의 hash key 체크
 * @apiName Hash Key Check
 * @apiGroup Util
 * @apiVersion 1.0.0
 *
 * @apiParam {String} hash_key  앱의 해쉬키
 *
 * @apiSuccess {Object} errorData  에러 정보
 * @apiSuccess {int32} errorData.errorCode  에러 코드 (성공시에 O으로 나옴)
 * @apiSuccess {String} errorData.errorMessage  에러 메세지 (성공시에 ok)
 * @apiSuccess {int64} errorData.time  현재시간
 *
 * @apiError {Object} errorData  에러 메세지 정보
 * @apiError {int32} errorData.errorCode  에러 코드
 * @apiError {String} errorData.errorMessage  에러 메세지
 * @apiError {int64} errorData.time  현재시간
 */
router.post('/hash_check', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var hash_key = _packet_data.body.hash_key;
    var result = {};
    mysqlconnection(function(err, connection) {
        if (err) {
            if (connection !== null) {
                connection.release();
            }
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            result.errorCode = err.errno;
            result.errorMessage = err.message;
            process_packet.send_packet(res, result);
        }

        if (connection) {
            connection.query('SELECT * FROM main_info WHERE server_info_id=0', function(err, rows) {

                if (rows == null ||  rows.length == 0) {
                    connection.release();
                    result.errorCode = -1;
                } else {
                    connection.release();
                    if (rows[0].android_hash_key == hash_key) {
                        result.errorCode = 0;
                    } else {
                        result.errorCode = -1;
                    }
                }
                process_packet.send_packet(res, result);
            });
        }
    });
});



/**
 * @api {post} /version_check  버전 체크
 * @apiName APP Version check
 * @apiGroup Util
 * @apiVersion 1.0.0
 *
 * @apiParam {int32} type  플랫폼 타입 (0 IOS , 1 Android)
 * @apiParam {int32} version 앱의 버전
 *
 * @apiSuccess {Object} errorData  에러 정보
 * @apiSuccess {int32} errorData.errorCode  에러 코드 (성공시에 O으로 나옴)
 * @apiSuccess {String} errorData.errorMessage  에러 메세지 (성공시에 ok)
 * @apiSuccess {int64} errorData.time  현재시간
 *
 * @apiError {Object} errorData  에러 메세지 정보
 * @apiError {int32} errorData.errorCode  에러 코드
 * @apiError {String} errorData.errorMessage  에러 메세지
 * @apiError {int64} errorData.time  현재시간
 */
router.post('/version_check', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var type = _packet_data.body.type;
    var version = _packet_data.body.version;
    var result = {};
    mysqlconnection(function(err, connection) {
        if (err) {
            if (connection !== null) {
                connection.release();
            }
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            result.errorCode = err.errno;
            result.errorMessage = err.message;

            var logdata = {};
            logdata.error = err;
            log_manager.log('system_db', 'version_check db connection failed', logdata);
            process_packet.send_packet(res, result);
        }

        if (connection) {
            connection.query('SELECT * FROM main_info WHERE server_info_id=0', function(err, rows) {

                if (rows.length == 0) {
                    connection.release();
                    result.errorCode = -1;
                } else {
                    connection.release();
                    if (type == 1)
                    {
                        if (rows[0].android_short_version <= version) {
                            result.errorCode = 0;
                        } else {
                            result.errorCode = -1;
                        }
                    }
                    else
                    {
                        if (rows[0].ios_short_version <= version) {
                            result.errorCode = 0;
                        } else {
                            result.errorCode = -1;
                        }
                    }

                }
                process_packet.send_packet(res, result);
            });
        }
    });
});




module.exports = router;
