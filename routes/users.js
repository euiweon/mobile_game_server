var express = require('express');
var router = express.Router();
const uuidV1 = require('uuid/v1');
var async = require('async');
var mysqlconnection = require('./mysqlconnection');
var process_packet = require('./process_packet');
var log_manager = require('./log_manager');

/* GET users listing. */
function login(callback, device_id) {
    mysqlconnection(function(err, connection) {
        if (err) {
            if (connection !== null) {
                connection.release();
            }
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            callback(err);
        }

        if (connection) {
            connection.query('SELECT * FROM userinfo WHERE device_id=?', [device_id], function(err, rows) {

                if (rows.length == 0) {
                    connection.release();
                    callback(new Error('not found  user_id'));
                } else {
                    connection.release();
                    callback(null, rows[0]);
                }
            });
        }
    });
}

/**
 * @api {post} /users/create_user 유저 계정 생성
 * @apiName Create User
 * @apiGroup User
 * @apiVersion 1.0.0
 *
 * @apiParam {String} device_id  device_id는 유저의 기기 고유ID
 *
 * @apiSuccess {Object} user_data 유저 정보
 * @apiSuccess {String} user_data.user_id 유저 ID
 * @apiSuccess {String} user_data.device_id 유저 ID
 * @apiSuccess {String} user_data.create_date ID 생성일
 * @apiSuccess {String} user_data.update_date ID 정보 갱신일
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
router.post('/create_user', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var device_id = _packet_data.body.device_id;
    var result = {};
    var errorcode = 0;
    async.waterfall([
        // User Data 있는지 여부 검사
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }

                    errorcode = -1;
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    callback(err);
                }

                if (connection) {
                    connection.query('SELECT * FROM userinfo WHERE device_id=?', [device_id], function(err, rows) {

                        if (parseInt(rows.length)  === 0) {
                            connection.release();
                            callback(null);
                        } else {
                            errorcode = -100;
                            connection.release();
                            callback(new Error('already create  user_id'));
                        }
                    });
                }
            })

        },
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    errorcode = -1;
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    callback(err);
                }

                if (connection) {
                    var userdata = {};
                    userdata.user_id = uuidV1();

                    if (userdata.user_id === null)
                    {
                        errorcode = -101;
                        connection.release();
                        callback(err);
                    }
                    else
                    {
                        userdata.user_id = userdata.user_id.toString().toUpperCase();
                        userdata.device_id = device_id;
                        userdata.create_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                        userdata.update_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                        connection.query('INSERT INTO userinfo SET ?', [userdata], function(err) {

                            if (err) {
                                errorcode = -101;
                                connection.release();
                                callback(err);
                            } else {
                                connection.release();
                                callback(null);
                            }
                        });
                    }

                }
            });
        },
        function(callback) {
            login(function(err, result_userdata) {
                if (err) {
                    errorcode = -102;
                    callback(err);
                } else {
                    result.user_data = result_userdata;
                    callback(null);
                }
            }, device_id);
        }
    ], function(err) {
        var log = {};
        if (err) {
            result.errorCode = errorcode;
            result.errorMessage = err.message;

            log.error = err;
            log.user_id = device_id;
            log_manager.log('system_user' , 'Create User failed',  log);

        } else {
            result.errorCode = 0;

            ///////////////////////////////////////////////////////////////////////////////////////////////////////
            // Log
            log.device_id  = result.user_data.device_id;
            log.create_date  = result.user_data.create_date;
            log.update_date =  result.user_data.update_date;
            log.message = 'Create User \n User ID : ' +  log.user_id  +'\nDevice ID :  '+log.device_id
                +'\nCreate Date:  '+log.create_date;

            log_manager.log(result.user_data.user_id , 'Create User',  log);
            /////////////////////////////////////////////////////////////////////////////////////////////////////

        }
        process_packet.send_packet(res, result);
    });

});

/**
 * @api {post} /users/login 유저 로그인
 * @apiName Login
 * @apiGroup User
 * @apiVersion 1.0.0
 *
 * @apiParam {String} device_id  device_id는 유저의 기기 고유ID
 *
 * @apiSuccess {Object} user_data 유저 정보
 * @apiSuccess {String} user_data.user_id 유저 ID
 * @apiSuccess {String} user_data.device_id 유저 ID
 * @apiSuccess {String} user_data.create_date ID 생성일
 * @apiSuccess {String} user_data.update_date ID 정보 갱신일
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

router.post('/login', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var device_id = _packet_data.body.device_id;
    var result = {};
    login(function(login_err, result_userdata) {
        // Login Time Update
        if (login_err) {
            result.errorCode = -102;
            result.errorMessage = login_err.message;
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            var logdata = {};
            logdata.error = login_err;
            log_manager.log('system_user', 'login error', logdata);
            ////////////////////////////////////////////////////////////////////////////
            process_packet.send_packet(res, result);
            return;
        }
        else
        {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    result.errorCode =  -1;
                    result.errorMessage = err.message;

                    ///////////////////////////////////////////////////////////////////////////////
                    // 로그
                    var logdata = {};
                    logdata.error = result;
                    log_manager.log('system_db', 'login db connection failed', logdata);
                    ////////////////////////////////////////////////////////////////////////////
                    process_packet.send_packet(res, result);
                    return;
                }

                if (connection) {
                    var user_update_date =  (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                    var queryString = 'UPDATE  userinfo SET update_date=? WHERE device_id=?';
                    connection.query(queryString, [user_update_date, device_id], function(err, result1) {
                        if (err) {
                            connection.release();
                            result.errorCode =  -102;
                            result.errorMessage = err.message + ' '+ '// Login Update time DB Error';

                            ///////////////////////////////////////////////////////////////////////////////
                            // 로그
                            var logdata = {};
                            logdata.user_id = result_userdata.user_id;
                            logdata.device_id = device_id;
                            logdata.error = err;
                            log_manager.log('system_db', 'userinfo update failed', logdata);
                            ////////////////////////////////////////////////////////////////////////////
                            process_packet.send_packet(res, result);
                        } else {
                            connection.release();
                            result = result_userdata;
                            result.errorCode = 0;
                            ///////////////////////////////////////////////////////////////////////////////////////////////////////
                            // Log
                            var log = {};
                            log.user_id = result_userdata.user_id ;
                            log.device_id  = result_userdata.device_id;
                            log.update_date =  user_update_date;
                            log.action = 'Login User';
                            log.action_string = 'Login User' +"\n"+
                                'User ID : ' +  log.user_id  +"\n" +
                                'Device ID :  '+log.device_id+"\n"+
                                'Update Date:  '+log.update_date;
                            log.date =  (new Date()).toISOString();
                            log_manager.log(log);
                            /////////////////////////////////////////////////////////////////////////////////////////////////////

                            process_packet.send_packet(res, result);
                        }
                    });
                }
            });
        }

    }, device_id);
});

/**
 * @api {post} /users/change_nick 닉네임변경
 * @apiName Change Nick
 * @apiGroup User
 * @apiVersion 1.0.0
 *
 * @apiParam {String} user_id  로그인 후 받은 User의 고유 ID
 * @apiParam {String} user_name  변경하고 싶은 닉네임. (서버에서 금칙어 처리가 안되므로 주의 바람)
 *
 * @apiSuccess {Object} errorData  에러 정보
 * @apiSuccess {int32} errorData.errorCode  에러 코드 (성공시에 O으로 나옴)
 * @apiSuccess {String} errorData.errorMessage  에러 메세지 (성공시에 ok)
 * @apiSuccess {int64} errorData.time  현재시간
 *
 * @apiError {Object} errorData  에러 정보
 * @apiError {int32} errorData.errorCode  에러 코드
 * @apiError {String} errorData.errorMessage  에러 메세지
 * @apiError {int64} errorData.time  현재시간
 */
router.post('/change_nick', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var user_id = _packet_data.body.user_id;
    var user_name =  _packet_data.body.user_name;
    var result = {};

    // 금칙어 처리

    // 변경

    mysqlconnection(function(err, connection) {
        if (err) {
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            result.errorCode =  -1;
            result.errorMessage = err.message;
            process_packet.send_packet(res, result);
            return;
        }

        if (connection) {
            var queryString = 'UPDATE  userinfo SET user_name=? WHERE user_id=?';
            connection.query(queryString, [user_name, user_id], function(err, result1) {
                if (err) {
                    connection.release();
                    result.errorCode =  -103;
                    result.errorMessage = err.message;
                    process_packet.send_packet(res, result);
                } else {
                    connection.release();
                    result.errorCode = 0;
                    ///////////////////////////////////////////////////////////////////////////////////////////////////////
                    // Log
                    var log = {};
                    log.action = 'User Change Nickname';
                    log.user_id = user_id;
                    log.action_string = 'Change Nickname' +"\n";
                    log.date =  (new Date()).toISOString();
                    log_manager.log(log);
                    /////////////////////////////////////////////////////////////////////////////////////////////////////

                    process_packet.send_packet(res, result);
                }
            });
        }
    });
});

module.exports = router;