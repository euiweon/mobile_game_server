var express = require('express');
var router = express.Router();

var async = require('async');
var mysqlconnection = require('./mysqlconnection');
var process_packet = require('./process_packet');
var log_manager = require('./log_manager');

// 세이브와 로드 가능한지 체크
/**
 * @api {post} /userdata/check 유저 데이터 세이브 가능 여부 체크
 * @apiName User Data Save Check
 * @apiGroup User Data
 * @apiVersion 1.0.0
 *
 * @apiParam {String} account_id  유저와 연동된 계정의 ID (user_id 아님)
 *
 * @apiSuccess {int32} user_save_flag 로드/저장 상태 flag 정보 (이 정보가 아예 없을 경우 DB에 데이터가 없다는 이야기)
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
router.post('/check', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var account_id = _packet_data.body.account_id;
    var result = {};


    if (account_id == null) {
        result.user_save_flag = -1;
        result.errorCode = -200;
        result.errorMessage = 'not found account_id ';

        ///////////////////////////////////////////////////////////////////////////////
        // 로그
        var logdata = {};
        logdata.error = result;
        log_manager.log('system_common', 'not found account_id', logdata);
        ////////////////////////////////////////////////////////////////////////////

        process_packet.send_packet(res, result);
        return;
    }
    mysqlconnection(function(err, connection) {
        if (err) {
            if (connection !== null) {
                connection.release();
            }
            result.errorCode = -1;
            result.errorMessage = err.message;
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            var logdata = {};
            logdata.error = result;
            log_manager.log('system_db', 'db connection failed', logdata);
            ////////////////////////////////////////////////////////////////////////////
            process_packet.send_packet(res, result);
        } else {
            if (connection) {
                connection.query('SELECT * FROM userdata WHERE account_id=?', [account_id], function(err, rows) {
                    connection.release();
                    if (err) {
                        // 데이터가 에러
                        result.user_save_flag = -1;
                        result.errorCode = -1;
                        result.errorMessage = err.message;
                    } else if (rows.length == 0) {
                        // 데이터가 없을때
                        result.user_save_flag = 0;
                        result.errorCode = -200;
                        result.errorMessage = 'not found data';
                    } else {
                        // 데이터가 있을 경우
                        result.errorCode = 0;
                        result.user_save_flag = rows[0].flag;
                    }
                    process_packet.send_packet(res, result);
                });
            }
        }

    });
});

// 유저 정보 저장
router.post('/save', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var account_id = _packet_data.body.account_id;
    var save_data = _packet_data.body.save_data;

    var result = {};
    result.errorCode = 0;
    if (account_id == null || save_data == null) {
        result.errorCode = -200;
        result.errorMessage = 'not found account_id or save_data';


        ///////////////////////////////////////////////////////////////////////////////
        // 로그
        var logdata = {};
        logdata.error = result;
        log_manager.log('system_common', 'not found account_id or save_data', logdata);
        ////////////////////////////////////////////////////////////////////////////

        process_packet.send_packet(res, result);
        return;
    }

    async.waterfall([

        // flag check
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    result.errorCode = -1;
                    result.errorMessage = err.message;
                    callback(err);
                } else {
                    if (connection) {
                        connection.query('SELECT * FROM userdata WHERE account_id=?', [account_id], function(err, rows) {
                            if (err) {
                                err.errno = -1;
                                connection.release();
                                callback(err);
                            } else if (rows.length == 0) {
                                //  세이브 하는것이 처음일경우
                                connection.release();
                                mysqlconnection(function(err, connection2) {
                                    if (err) {
                                        if (connection2 !== null) {
                                            connection2.release();
                                        }
                                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                        callback(err);
                                    }

                                    if (connection2) {

                                        connection2.query('INSERT INTO userdata SET flag=1, save_data=?, account_id=? ', [save_data, account_id], function(err, result1) {
                                            if (err) {

                                                connection2.release();
                                                callback(err);
                                            } else {
                                                connection2.release();
                                                var error = new Error('create save data');
                                                error.errno = 0;
                                                callback(error);
                                            }
                                        });
                                    }
                                });
                            } else if (rows[0].flag != 0) {
                                connection.release();
                                var error = new Error('error save');
                                error.errno = -202;
                                callback(error);
                            } else {
                                connection.release();
                                callback(null);
                            }
                        });
                    }
                }

            });
        },
        // 유저 정보 저장
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    result.errorCode = -1;
                    result.errorMessage = err.message;
                    callback(err);
                } else {
                    if (connection) {
                        var query = 'UPDATE userdata SET flag=1, save_data=? WHERE account_id=? AND flag=0';
                        connection.query(query, [save_data, account_id], function(err, results) {
                            if (err) {
                                connection.release();
                                console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                result.errorCode = -1;
                                result.errorMessage = err.message;
                                callback(err);
                            } else if (results.changedRows != 1) {
                                connection.release();
                                result.errorCode = -203;
                                callback(null);
                            } else {
                                connection.release();
                                result.errorCode = 0;
                                callback(null);
                            }
                        });
                    }
                }
            });
        }
    ], function(err) {
        var logdata = {};
        if (err) {
            result.errorCode = err.errno;
            result.errorMessage = err.message;
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            logdata.error = result;
            if (result.errorCode == 0)
            {
                log_manager.log(account_id, 'user data save success', logdata);
            }
            else
            {
                log_manager.log('system_userdata', 'user data save failed', logdata);
            }

            ////////////////////////////////////////////////////////////////////////////

        } else {
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            logdata.error = result;
            log_manager.log(account_id, 'user data save success', logdata);
            ////////////////////////////////////////////////////////////////////////////
        }
        process_packet.send_packet(res, result);
});

});

router.post('/load', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var account_id = _packet_data.body.account_id;
    var result = {};
    result.errorCode = 0;
    if (account_id === null || account_id === undefined) {
        result.errorCode = -200;
        result.errorMessage = 'not found account_id';
        ///////////////////////////////////////////////////////////////////////////////
        // 로그
        var logdata = {};
        logdata.error = result;
        log_manager.log('system_common', 'not found account_id', logdata);
        ////////////////////////////////////////////////////////////////////////////
        process_packet.send_packet(res, result);
        return;
    }

    async.waterfall([
        // flag 체크 &  가져오기
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    err.errno = -1;
                    callback(err);
                } else {
                    if (connection) {
                        connection.query('SELECT * FROM userdata WHERE account_id=?', [account_id], function(err, rows) {
                            if (err) {
                                err.errno = -1;
                                connection.release();
                                callback(err);
                            } else if (rows.length > 0 && parseInt(rows[0].flag) !== 0) {
                                connection.release();
                                result.save_data = rows[0].save_data;
                                callback(null)
                            } else {
                                connection.release();
                                var error = new Error('error load');
                                error.errno = -204;
                                callback(error);
                            }
                        });
                    }
                }
            });
        },

        // flag  변경
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    err.errno = -1;
                    callback(err);
                } else {
                    if (connection) {
                        var query = 'UPDATE userdata SET flag=0 WHERE account_id=? AND flag=1';
                        connection.query(query, [account_id], function(err, results) {
                            if (err) {
                                connection.release();
                                console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                err.errno = -1;
                                callback(err);
                            } else if (parseInt(results.changedRows) !== 1) {
                                connection.release();
                                result.errorCode = -203;
                                callback(null);
                            } else {
                                connection.release();
                                result.errorCode = 0;
                                callback(null);
                            }
                        });
                    }
                }
            });
        }

    ], function(err) {
        var logdata = {};
        if (err) {
            result.errorCode = err.errno;
            result.errorMessage = err.message;

            ///////////////////////////////////////////////////////////////////////////////
            // 로그

            logdata.error = result;
            log_manager.log('system_userdata', 'user data load failed', logdata);
            ////////////////////////////////////////////////////////////////////////////

        } else {


            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            logdata.error = result;
            log_manager.log(account_id, 'user data load success', logdata);
            ////////////////////////////////////////////////////////////////////////////
        }
        process_packet.send_packet(res, result);
    });

});


module.exports = router;
