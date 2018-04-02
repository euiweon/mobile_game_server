/**
 * Created by euiweon on 2017-02-07.
 */
var express = require('express');
var router = express.Router();

var async = require('async');

var mysqlconnection = require('./mysqlconnection');
var process_packet = require('./process_packet');
var log_manager = require('./log_manager');

// 전체 우편함에서  받은내역 검색
function getNoticeUserDisableList(user_id, callback)
{
    var notice_gift_list = [];
    mysqlconnection(function(err, connection) {
        if (err) {
            if (connection !== null) {
                connection.release();
            }

            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            err.errno = -1;
            callback(notice_gift_list);
        }

        else if (connection) {
            connection.query('SELECT * FROM mail WHERE user_id=? AND mail_type=?', [user_id, 'notice'], function(err, rows) {

                if (parseInt(rows.length) === 0) {
                    connection.release();
                    callback(notice_gift_list);
                } else {
                    connection.release();
                    for (var i = 0; i < rows.length ; i++)
                    {
                        notice_gift_list.push(rows[i].notice_id);
                    }
                    callback(notice_gift_list);
                }
            });
        }
        else {
            callback(notice_gift_list);
        }
    });
}

/* GET users listing. */
function getMailList(callback, user_id) {
    var result = {};
    var notice_gift_list = [];
    console.log('user_id :'+ user_id);
    async.waterfall([
        // 일반 우편함 검색
        function(cb1) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }

                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    err.errno = -1;
                    cb1(err);
                }

                else if (connection) {
                    connection.query('SELECT * FROM mail WHERE user_id=? AND end_date >= NOW() AND flag=0 AND mail_type=?', [user_id,'normal'], function(err, rows) {
                        if ( rows === null || parseInt(rows.length) === 0) {
                            connection.release();
                            result.data = [];
                            cb1(null);
                        } else {
                            connection.release();
                            for (var i = 0; i < rows.length ; i++)
                            {
                                rows[i].mail_type = 'normal';
                            }
                            result.data = rows;
                            cb1(null);
                        }
                    });
                }
                else {
                    cb1(null);
                }

            });
        },

        function(cb1) {
            getNoticeUserDisableList(user_id, function(notice_already_gift_list){
                notice_gift_list = notice_already_gift_list;
                cb1(null);
            });
        },
        // 전체 우편함에서 받아야될 리스트 검색 (이미 받은 우편은 삭제)
        function(cb1) {
            if (notice_gift_list  !== null && parseInt(notice_gift_list.length) !== 0)
            {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        err.errno = -1;
                        cb1(err);
                    }

                    else if (connection) {
                        var now_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                        var myQuery = "SELECT * FROM " + "notice" + " WHERE end_date >= NOW() AND notice_id NOT IN ('" + notice_gift_list.join("','") + "')";

                        connection.query(myQuery, function(err, rows) {
                            if (parseInt(rows.length) === 0) {
                                connection.release();
                                cb1(null);
                            } else {
                                connection.release();
                                for (var i = 0; i < rows.length ; i++)
                                {
                                    var temp_notice_mail = {};
                                    temp_notice_mail.mail_type = 'notice';
                                    temp_notice_mail.mail_item_message = rows[i].mail_item_message;
                                    temp_notice_mail.mail_item_type = rows[i].mail_item_type;
                                    temp_notice_mail.mail_item_count = rows[i].mail_item_count;
                                    temp_notice_mail.notice_id =  rows[i].notice_id;
                                    temp_notice_mail.end_date = rows[i].end_date;

                                    result.data.push(temp_notice_mail);
                                }
                                cb1(null);
                            }
                        });
                    }
                    else
                    {
                        cb1(null);
                    }
                });
            }
            else
            {
                cb1(null);
            }

        }], function(err) {
        if (err) {
            console.log(err);
        }
        callback(err, result);
    });

}

/**
 * @api {post} /mail/get_mail_list 우편함 정보 가져오기
 * @apiName Get Mail List
 * @apiGroup Mail
 * @apiVersion 1.0.0
 *
 * @apiParam {String} user_id  유저의 ID
 *
 * @apiSuccess {Object[]} mail_list 우편 리스트
 * @apiSuccess {int64} mail_list.mail_id 우편 ID (일반 우편일 경우 존재)
 * @apiSuccess {String} mail_list.mail_type 우편의 종류 (일반 우편일 경우 normal 전체 우편일 경우 notice)
 * @apiSuccess {String} mail_list.mail_item_message 우편의 메세지
 * @apiSuccess {int32} mail_list.mail_item_type 우편의 아이템 종류
 * @apiSuccess {int32} mail_list.mail_item_count 우편의 아이템 갯수
 * @apiSuccess {int32} mail_list.notice_id 전체우편의 ID (전체우편일 경우만 존재)
 * @apiSuccess {String} mail_list.end_date 유효기간
 * @apiSuccess {int32} mail_list.flag 아이템을 받았는지 여부 (일반우편일 경우 0, 전체 우편일 경우 값 없음)
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
router.post('/get_mail_list', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var user_id = _packet_data.body.user_id;
    var result = {};
    getMailList(function(err, mail_list) {
        if (err) {
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            result.errorCode = err.errno;
            result.errorMessage = err.message;

            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            var logdata = {};
            logdata.user_id = user_id;
            logdata.error = err;

            if (user_id )
                log_manager.log('system_mail', 'error get mail list', logdata);
            else
                log_manager.log(user_id, 'error get mail list', logdata);
            ////////////////////////////////////////////////////////////////////////////

        } else {
            if (parseInt(mail_list.length) === 0) {
                result.errorCode = 0;
                result.mail_list = [];
            } else {
                result.errorCode = 0;
                result.mail_list = mail_list.data;
            }
        }
        process_packet.send_packet(res, result);
    }, user_id);
});


/**
 * @api {post} /mail/get_gift 우편 하나 받기
 * @apiName Get Mail Item
 * @apiGroup Mail
 * @apiVersion 1.0.0
 *
 * @apiParam {String} user_id  유저의 ID
 * @apiParam {int64} mail_id  우편의 ID (일반 우편일 경우 필수)
 * @apiParam {int32} notice_id  우편의 ID (전체 우편일 경우 필수)
 * @apiParam {String} mail_type  메일 종류
 *
 * @apiSuccess {Object[]} mail_list 우편 리스트
 * @apiSuccess {int64} mail_list.mail_id 우편 ID (전체 우편도 받기 후 우편 ID가 생성)
 * @apiSuccess {String} mail_list.mail_type 우편의 종류 (일반 우편일 경우 normal 전체 우편일 경우 notice)
 * @apiSuccess {String} mail_list.mail_item_message 우편의 메세지
 * @apiSuccess {int32} mail_list.mail_item_type 우편의 아이템 종류
 * @apiSuccess {int32} mail_list.mail_item_count 우편의 아이템 갯수
 * @apiSuccess {int32} mail_list.notice_id 전체우편의 ID (일반 우편일 경우 0 전체우편일 경우 해당하는 전체우편 ID )
 * @apiSuccess {String} mail_list.end_date 유효기간
 * @apiSuccess {int32} mail_list.flag 아이템을 받았는지 여부 (0이 아닌 값이 존재해야함)
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
router.post('/get_gift', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var mail_id = _packet_data.body.mail_id;
    var user_id = _packet_data.body.user_id;
    var notice_id = _packet_data.body.notice_id;
    var mail_type =  _packet_data.body.mail_type;
    var result = {};
    result.errorCode = 0;
    result.errorMessage = '';
    result.mail_list = [];
    async.waterfall([
        // 검색
        function(callback) {
            if (String(mail_type) === 'notice')
            {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        err.errno = -1;
                        callback(err);

                    }
                    else if (connection) {
                        connection.query('SELECT * FROM mail WHERE notice_id=? AND user_id=? ', [notice_id, user_id], function(err, rows) {

                            if (parseInt(rows.length) === 0) {
                                connection.release();
                                callback(null, null);
                            } else {
                                var error = new Error('already get  notice_id');
                                error.errno = -400;
                                connection.release();
                                callback(error);
                            }
                        });
                    }
                    else {
                        var error = new Error('DB Connection Error');
                        error.errno = -2;
                        callback(error);
                    }
                });
            }
            else
            {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        err.errno = -1;
                        callback(err);
                     }

                    else if (connection) {
                        connection.query('SELECT * FROM mail WHERE mail_id=? AND flag=0', [mail_id], function(err, rows) {

                            if (parseInt(rows.length) === 0) {
                                connection.release();
                                var error = new Error('not found  mail_id');
                                error.errno = -401;
                                callback(error);
                            } else {
                                connection.release();
                                var mail_data = rows[0];
                                callback(null, mail_data);
                            }
                        });
                    }
                    else {
                        var error = new Error('DB Connection Error');
                        error.errno = -2;
                        callback(error);
                    }
                });
            }
        },

        // get
        function(mail_data, callback) {
            if (mail_data !== null)
                result.mail_list.push(mail_data);
            callback(null);
        },

        // 받기 처리
        function(callback) {
            if (String(mail_type) === 'notice')
            {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        err.errno = -1;
                        callback(err);
                     }

                    else if (connection) {
                        connection.query('SELECT * FROM notice WHERE notice_id=? AND end_date >= NOW()', [notice_id], function(err, rows) {

                            if (parseInt(rows.length)  === 0) {
                                connection.release();
                                callback(null);
                            } else {
                                connection.release();
                                mysqlconnection(function(err1, connection1) {
                                    if (err1) {
                                        if (connection1 !== null) {
                                            connection1.release();
                                        }
                                        err1.errno = -403;
                                        console.log('error code : ' + err1.errno + 'errorMessage' + err1.message);
                                        callback(err1);
                                    }

                                    if (connection1) {
                                        var mail_data = {};
                                        mail_data.mail_type = 'notice';
                                        mail_data.mail_item_type = rows[0].mail_item_type;
                                        mail_data.mail_item_count = rows[0].mail_item_count;
                                        mail_data.mail_item_message = rows[0].mail_item_message;
                                        mail_data.end_date = rows[0].end_date;
                                        mail_data.user_id = user_id;
                                        mail_data.create_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                                        mail_data.update_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                                        mail_data.flag = 1;
                                        mail_data.notice_id = rows[0].notice_id;
                                        result.mail_list.push(mail_data);

                                        connection1.query('INSERT INTO mail SET ?', [mail_data], function(err2) {
                                            if (err2) {
                                                err2.errno = -1;
                                                connection1.release();
                                                callback(err2);
                                            } else {
                                                connection1.release();
                                                callback(null);
                                            }
                                        });
                                    }
                                });

                            }
                        });
                    } else {
                        var error = new Error('DB Connection Error');
                        error.errno = -2;
                        callback(error);
                    }
                });

            }
            else
            {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        err.errno = -1;
                        callback(err);
                    } else {
                        if (connection) {
                            connection.query('UPDATE  mail SET flag=1 WHERE mail_id=? AND flag=0', [mail_id], function(err, results) {
                                if (err) {
                                    connection.release();
                                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                    callback(err);
                                } else if (parseInt(results.changedRows) !== 1) {
                                    connection.release();
                                    result.errorCode = -1;
                                    callback(null);
                                } else {
                                    connection.release();
                                    result.errorCode = 0;
                                    callback(null);
                                }
                            });
                        } else {
                            var error = new Error('DB Connection Error');
                            error.errno = -2;
                            callback(error);
                        }
                    }
                });
            }

        }
    ], function(err) {
        var logdata = {};
        if (err) {

            result.errorCode = err.errno;
            result.errorMessage = err.message;
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            logdata.user_id = user_id;
            logdata.error = err;

            if (user_id )
                log_manager.log('system_mail', 'error get mail gift', logdata);
            else
                log_manager.log(user_id, 'error get mail gift ', logdata);
            ////////////////////////////////////////////////////////////////////////////
        }
        else
        {
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            logdata.user_id = user_id;
            logdata.mail_type =  mail_type;
            if (String(mail_type) === 'notice')
                logdata.notice_id = notice_id;
            else
                logdata.mail_id = mail_id;
            log_manager.log(user_id, 'get mail success ', logdata);

            ////////////////////////////////////////////////////////////////////////////
        }
        process_packet.send_packet(res, result);
    });
});

/**
 * @api {post} /mail/get_gift_all 우편 전체 받기
 * @apiName Get All Mail Item
 * @apiGroup Mail
 * @apiVersion 1.0.0
 *
 * @apiParam {String} user_id  유저의 ID
 *
 * @apiSuccess {Object[]} mail_list 우편 리스트  ( '/mail/get_mail_list' 값과 동일한 내용이 출력됨.
 * 확인 용도로만 사용바람. 에러가 발생해도 이 리스트는 그대로 유지)
 * @apiSuccess {int64} mail_list.mail_id 우편 ID (전체 우편도 받기 후 우편 ID가 생성)
 * @apiSuccess {String} mail_list.mail_type 우편의 종류 (일반 우편일 경우 normal 전체 우편일 경우 notice)
 * @apiSuccess {String} mail_list.mail_item_message 우편의 메세지
 * @apiSuccess {int32} mail_list.mail_item_type 우편의 아이템 종류
 * @apiSuccess {int32} mail_list.mail_item_count 우편의 아이템 갯수
 * @apiSuccess {int32} mail_list.notice_id 전체우편의 ID (일반 우편일 경우 0 전체우편일 경우 해당하는 전체우편 ID )
 * @apiSuccess {String} mail_list.end_date 유효기간
 * @apiSuccess {int32} mail_list.flag 아이템을 받았는지 여부 (0이 아닌 값이 존재해야함)
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
router.post('/get_gift_all', function(req, res) {
    var _packet_data = process_packet.recv_packet(req);
    var user_id = _packet_data.body.user_id;
    var result = {};
    var notice_gift_list = [];
    var notice_get_gift_list = [];

    result.errorCode = 0;
    result.errorMessage = '';
    result.mail_list = [];
    async.waterfall([
        // 일반+전체 우편 검색(뭘 받았는지, 클라이언트에서 확인 용도로...)
        function(callback) {
            getMailList(function(err, rows) {
                if (err) {
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    err.errno = -1;
                    callback(err);
                } else {
                    result.errorCode = 0;
                    result.mail_list = rows;
                    callback(null);
                }

            }, user_id);
        },

        // 일반 우편 모두 받기 처리
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    err.errno = -1;
                    callback(err);
                } else {
                    if (connection) {
                        connection.query('UPDATE  mail SET flag=1 WHERE user_id=? AND flag=0', user_id, function(err, results) {

                            if (results === null) {
                                connection.release();
                                var error = new Error('update failed');
                                error.errno = -402;
                                callback(error);
                            } else {
                                connection.release();
                                result.errorCode = 0;
                                result.changedRows = results.changedRows;
                                callback(null);
                            }
                        });
                    } else {
                        var error = new Error('DB Connection Error');
                        error.errno = -2;
                        callback(error);
                    }

                }
            });
        },
        // 전체 우편함에서 예외 처리할 내역
        function(callback) {
            getNoticeUserDisableList(user_id, function(notice_already_gift_list){
                notice_gift_list = notice_already_gift_list;
                callback(null);
            });
        },
        // 전체 우편함에서 처리할 데이터 검색
        function(callback) {
            if (notice_gift_list  !== null && parseInt(notice_gift_list.length) !== 0)
            {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        err.errno = -1;
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        callback(err);

                    }

                    else if (connection) {
                        var myQuery = "SELECT * FROM " + "notice" + " WHERE end_date >= NOW() AND notice_id NOT IN ('" + notice_gift_list.join("','") + "')";

                        connection.query(myQuery, function(err, rows) {
                            if (parseInt(rows.length) === 0) {
                                var error = new Error('Notice Get Error');
                                connection.release();
                                notice_get_gift_list = [];
                                error.errno = -404;
                                callback(err);
                            } else {
                                connection.release();
                                for (var i = 0; i < rows.length ; i++)
                                {
                                    var temp_notice_mail = {};
                                    temp_notice_mail.mail_type = 'notice';
                                    temp_notice_mail.mail_item_message = rows[i].mail_item_message;
                                    temp_notice_mail.mail_item_type = rows[i].mail_item_type;
                                    temp_notice_mail.mail_item_count = rows[i].mail_item_count;
                                    temp_notice_mail.notice_id =  rows[i].notice_id;
                                    temp_notice_mail.end_date = rows[i].end_date;
                                    temp_notice_mail.user_id = user_id;
                                    temp_notice_mail.create_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
                                    temp_notice_mail.update_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');


                                    notice_get_gift_list.push(temp_notice_mail);
                                }
                                callback(null);
                            }
                        });
                    }
                    else {
                        var error = new Error('DB Connection Error');
                        error.errno = -2;
                        callback(error);
                    }
                });
            }
            else
            {
                callback(null);
            }

        },
        //  DB에 받았다고 리스트에 등록
       function (callback){
            if (notice_get_gift_list.length <= 0)
            {
                callback(null);
                return;
            }
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    err.errno = -1;
                    callback(err);

                }
                else if (connection) {

                    var myQuery = 'INSERT INTO mail (user_id, notice_id, mail_type,' +
                        'mail_item_count, mail_item_type, mail_item_message,' +
                        'end_date, create_date, update_date, flag) VALUES ?';

                    var valueList = [];

                    for (var i = 0; i < notice_get_gift_list.length ; i++)
                    {
                        var temp_notice_gift_data = [];
                        temp_notice_gift_data.push(notice_get_gift_list[i].user_id);
                        temp_notice_gift_data.push(notice_get_gift_list[i].notice_id);
                        temp_notice_gift_data.push(notice_get_gift_list[i].mail_type);
                        temp_notice_gift_data.push(notice_get_gift_list[i].mail_item_count);
                        temp_notice_gift_data.push(notice_get_gift_list[i].mail_item_type);
                        temp_notice_gift_data.push(notice_get_gift_list[i].mail_item_message);
                        temp_notice_gift_data.push(notice_get_gift_list[i].end_date);
                        temp_notice_gift_data.push(notice_get_gift_list[i].create_date);
                        temp_notice_gift_data.push(notice_get_gift_list[i].update_date);
                        temp_notice_gift_data.push(1);

                        valueList.push(temp_notice_gift_data);
                    }

                    connection.query(myQuery, [valueList], function (err) {
                        if (err) {
                            connection.release();
                            err.errno = -1;
                            callback(err);
                        } else {
                            connection.release();
                            callback(null);
                        }
                    });
                } else {
                    var error = new Error('DB Connection Error');
                    error.errno = -2;
                    callback(error);
                }
            });
        }], function(err) {
        var logdata = {};
        if (err) {
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            logdata.user_id = user_id;
            logdata.error = err;

            result.errorCode = err.errno;
            result.errorMessage = err.message;
            if (user_id )
                log_manager.log('system_mail', 'error get all mail gift', logdata);
            else
                log_manager.log(user_id, 'error get all mail gift ', logdata);
            ////////////////////////////////////////////////////////////////////////////
        }
        else
        {
            ///////////////////////////////////////////////////////////////////////////////
            // 로그

            logdata.user_id = user_id;
            log_manager.log(user_id, 'get all mail success ', logdata);

            ////////////////////////////////////////////////////////////////////////////
        }
        process_packet.send_packet(res, result);
    });
});



module.exports = router;
