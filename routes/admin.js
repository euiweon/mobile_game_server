/**
 * Created by euiweon on 2017-02-20.
 */
var express = require('express');
var async = require('async');
var fs = require('fs');
var mysqlconnection = require('./mysqlconnection');
var asyncLoop = require('node-async-loop');
var ranking = require('./ranking');
var log_manager = require('./log_manager');


// 기본적인 우편의 유효기간 추가.
var getMailValidity = function() {
    var default_end_date = new Date(Date.now() + (180 * 1000 * 60 * 60 * 24));
    var value = default_end_date.toISOString().replace(/T.*$/, '');
    return value;
};

// 메일 종류
var getMailTypeList = function() {
    var mailTypeList = [];
    for (var i = 0; i < global.mail_type_list.length; i++) {
        mailTypeList.push(global.mail_type_list[i].Type);
    }
    return mailTypeList;
};

// 메일 타입 ID
var getMailTypeID = function(typename) {
    for (var i = 0; i < global.mail_type_list.length; i++) {
        if (global.mail_type_list[i].Type == typename) {
            return global.mail_type_list[i].ID;
        }
    }
    return -1;

};

var getMailTypeIcon = function(typename) {
    for (var i = 0; i < global.mail_type_list.length; i++) {
        if (global.mail_type_list[i].Type == typename) {
            return '/images/'+global.mail_type_list[i].icon_img+'.png';
        }
    }
    return '';

};




function createNoticeList(notice_item_type_name, notice_item_count,notice_item_message, notice_end_date, callback) {
    mysqlconnection(function(err, connection) {
        if (err) {
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            if (connection) {
                connection.release();
            }
            callback(err);
        }
        if (connection) {

            var mail_data = {};
            mail_data.mail_item_type =  getMailTypeID(notice_item_type_name);
            mail_data.mail_item_icon = getMailTypeIcon(notice_item_type_name);
            mail_data.mail_item_count = notice_item_count;
            mail_data.mail_item_message = notice_item_message.toString();
            mail_data.end_date = notice_end_date;

            connection.query('INSERT INTO notice SET ?', [mail_data], function(err) {
                if (err) {
                    console.log(err);
                    connection.release();
                    callback(err);
                } else {
                    connection.release();
                    callback(null);
                }
            });
        }
        else
        {
            callback(new Error('연결 에러'));
        }
    });
}


function getTotalMailList(user_id, cb1)
{
    var result = {};
    var gift_item_type_list = getMailTypeList();
    async.waterfall([
            // Notice
            function(callback) {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        callback(err);
                    }
                    else
                    {
                        if (connection !== null) {
                            connection.query('SELECT * FROM notice WHERE end_date >= NOW()', function (err, rows) {
                                if (err) {

                                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                    result.error = err;
                                    connection.release();
                                    callback(null);

                                } else if (rows.length == 0) {
                                    connection.release();
                                    callback(null);
                                }
                                else
                                {
                                    result.notice_list = row;
                                    connection.release();
                                    callback(null);
                                }
                            });
                        }
                        else
                        {
                            callback(null);
                        }
                    }
                });
            },
            // User Mail
            function(callback) {
                if (user_id != null) {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            result.error = err;
                            result.default_end_date = getMailValidity();
                            result.gift_item_type_list = gift_item_type_list;
                            res.render('error', result);
                            return;
                        }

                        if (connection) {
                            connection.query('SELECT * FROM mail WHERE user_id=? AND end_date >= NOW()', user_id, function(err, rows) {

                                if (connection !== null) {
                                    connection.release();
                                }
                                if (err) {
                                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                    result.error = err;
                                    result.default_end_date = getMailValidity();
                                    result.gift_item_type_list = gift_item_type_list;
                                    callback(null);
                                    return;
                                } else if (rows.length == 0) {
                                    var err1 = new Error('이 유저 ID로는 검색되는 우편이 없음')
                                    err1.errno = 0;
                                    result.error = err1;
                                    result.user_id = user_id;
                                    result.default_end_date = getMailValidity();
                                    result.gift_item_type_list = gift_item_type_list;
                                    callback(null);

                                } else {
                                    result.mail_list = rows;
                                    result.user_id = user_id;
                                    result.default_end_date = getMailValidity();
                                    result.gift_item_type_list = gift_item_type_list;
                                    callback(null);
                                }
                            });
                        }
                    });
                }
                else
                {
                    result.default_end_date = getMailValidity();
                    result.gift_item_type_list = getMailTypeList();
                    callback(null);
                }
            }],
        function(err1)
        {
            cb1(result);
        });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main Tab
exports.main = function(req, res) {
    var result = {};
    mysqlconnection(function(err, connection) {
        if (err) {
            if (connection !== null) {
                connection.release();
            }
            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
            res.render('error', err);
        }

        if (connection) {
            connection.query('SELECT * FROM main_info WHERE server_info_id=0', function(err, rows) {

                if (rows === null || rows.length == 0) {
                    connection.release();
                    res.render('error');
                } else {
                    connection.release();

                    result.appinfo =  rows[0];
                    res.render('main_page', result);
                }
            });
        }
    });
};

exports.main_value_change = function(req, res) {

    var action = req.body.action;

    var android_version = req.body.android_version;
    var android_short_version = req.body.android_short_version;
    var android_hash_key = req.body.android_hash_key;
    var ios_version = req.body.ios_version;
    var ios_short_version = req.body.ios_short_version;

    if (action === null) {
        exports.main(req, res);
        return;
    }

    async.waterfall([
        function(callback) {

            if (action == 'android_version_change' || action == 'ios_version_change') {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        callback(err);
                    }

                    if (connection) {
                        var main_data = {};
                        main_data.android_version = android_version;
                        main_data.android_short_version = android_short_version;
                        main_data.android_hash_key = android_hash_key;
                        main_data.ios_version = ios_version;
                        main_data.ios_short_version = ios_short_version;

                        if (action == 'android_version_change') {
                            connection.query('UPDATE main_info SET android_version=?,  android_short_version=?, android_hash_key=?' +
                                ' WHERE server_info_id=0', [android_version, android_short_version, android_hash_key],
                                function(err, result1) {
                                    if (err) {
                                        errorcode = -2;
                                        connection.release();
                                        callback(err);
                                    } else {
                                        connection.release();
                                        callback(null);
                                    }
                                });
                        } else {
                            connection.query('UPDATE main_info SET ios_version=?,  ios_short_version=?' +
                                ' WHERE server_info_id=0', [ios_version, ios_short_version],
                                function(err, result1) {
                                    if (err) {
                                        errorcode = -2;
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

            } else {
                callback(new Error('Error Not Param'));
            }

        }
    ], function(err1) {


        ///////////////////////////////////////////////////////////////////////////////
        // 로그
        var logdata = {};
        logdata.action = action;

        if (action == 'android_version_change') {
            logdata.android_version = android_version;
            logdata.android_short_version = android_short_version;
            logdata.android_hash_key = android_hash_key;
        }
        else if (action == 'ios_version_change')
        {
            logdata.ios_version = ios_version;
            logdata.ios_short_version = ios_short_version;
        }

        if (err1)
        {
            logdata.error = err1;
        }
        if (action == 'android_version_change' || action == 'ios_version_change') {
            log_manager.log('system_admin', 'app version check fix', logdata);
        }
        ////////////////////////////////////////////////////////////////////////////

        exports.main(req, res);
        return;
    });

};




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// User Tab
exports.user = function(req, res) {
    //var redisClient = global.redisClient;
    var device_id = req.params.device_id;
    var user_id = req.params.user_id;
    var action = req.body.action;

    var result = {};
    var user_ranking_list = [];
    result.user_id = user_id;

    if (device_id == null && user_id == null) {
        res.render('user');
        return;
    }
    async.waterfall([
        // User Info
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    callback(err);
                }

                if (connection) {
                    if (user_id === null && device_id !== null) {
                        connection.query('SELECT * FROM userinfo WHERE device_id=?', device_id, function(err, rows) {

                            if (err|| rows === null) {
                                if (connection !== null)
                                    connection.release();
                                callback(new Error('DB Error1'));
                            }
                            else if (rows.length === 0) {
                                connection.release();
                                callback(new Error('not found  user_id'));
                            } else {
                                connection.release();
                                result.user_info = rows[0];
                                result.ranking_list = [];
                                callback(null);
                            }
                        });
                    } else if (user_id !== null) {
                        connection.query('SELECT * FROM userinfo WHERE user_id=?', user_id, function(err, rows) {

                            if (err|| rows === null) {
                                if (connection !== null)
                                    connection.release();
                                callback(new Error('DB Error2'));
                            }
                            else if (rows.length === 0) {
                                connection.release();
                                callback(new Error('not found  user_id'));
                            } else {
                                connection.release();
                                result.user_info = rows[0];
                                result.ranking_list = [];
                                callback(null);
                            }
                        });
                    }
                }
            });
        }
    ], function(err) {
        if (err) {
            result.error = err;
            res.render('user', result);
        } else {
            result.errorCode = 0;
            res.render('user', result);
        }
    });

};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Mail Tab
exports.mail = function(req, res) {
    var user_id = req.params.user_id;
    var gift_item_type_list = getMailTypeList();
    var action = req.body.action;
    var result = {};
    if (action == 'notice')
    {
        var notice_item_type_name = req.body.notice_type;
        var notice_item_type = -1;
        var notice_item_count = req.body.notice_count;
        var notice_item_message = req.body.notice_message;
        var notice_end_date = req.body.notice_enddate;

        createNoticeList(notice_item_type_name, notice_item_count, notice_item_message,notice_end_date, function(err){
            result.default_end_date = getMailValidity();
            result.gift_item_type_list = getMailTypeList();

            getTotalMailList(user_id, function(result_data) {
                res.render('mail', result_data);
            });
        });
    }
    else
    {
        async.waterfall([
                // Notice
                function(callback) {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            callback(err);
                        }
                        else
                        {
                            if (connection) {
                                connection.query('SELECT * FROM notice WHERE end_date >= NOW()', function (err, rows) {

                                    if (connection !== null) {
                                        connection.release();
                                    }

                                    if (err) {
                                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                        result.error = err;
                                        callback(null);
                                        return;
                                    } else if (rows.length == 0) {
                                        callback(null);
                                    }
                                    else
                                    {
                                        result.notice_list = rows;
                                        callback(null);
                                    }
                                });
                            }
                            else
                            {
                                callback(null);
                            }
                        }
                    });
                },
                // User Mail
                function(callback) {
                    if (user_id != null) {
                        mysqlconnection(function(err, connection) {
                            if (err) {
                                if (connection !== null) {
                                    connection.release();
                                }
                                console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                result.error = err;
                                result.default_end_date = getMailValidity();
                                result.gift_item_type_list = gift_item_type_list;
                                res.render('error', result);
                                return;
                            }

                            if (connection) {
                                connection.query('SELECT * FROM mail WHERE user_id=? AND end_date >= NOW()', user_id, function(err, rows) {

                                    if (connection !== null) {
                                        connection.release();
                                    }
                                    if (err) {
                                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                        result.error = err;
                                        result.default_end_date = getMailValidity();
                                        result.gift_item_type_list = gift_item_type_list;
                                        callback(null);
                                        return;
                                    } else if (rows.length == 0) {
                                        var err1 = new Error('이 유저 ID로는 검색되는 우편이 없음')
                                        err1.errno = 0;
                                        result.error = err1;
                                        result.user_id = user_id;
                                        result.default_end_date = getMailValidity();
                                        result.gift_item_type_list = gift_item_type_list;
                                        callback(null);

                                    } else {
                                        result.mail_list = rows;
                                        result.user_id = user_id;
                                        result.default_end_date = getMailValidity();
                                        result.gift_item_type_list = gift_item_type_list;
                                        callback(null);
                                    }
                                });
                            }
                        });
                    }
                    else
                    {
                        result.default_end_date = getMailValidity();
                        result.gift_item_type_list = getMailTypeList();
                        callback(null);
                    }
                }],
            function(err1)
            {
                res.render('mail', result);
            });
    }

};

exports.mail_send = function(req, res) {
    var action = req.body.action;

    if ('mail_data_disable' == action) {
        exports.mail_valid(req, res);
        return;
    } else if ('mail_data_enable' == action) {
        exports.mail_valid(req, res);
        return;
    } else if (action === null || mail_item_type == -1) {
        exports.mail(req, res);
        return;
    }

    console.log('mail_send start');

    var mail_item_type_name = req.body.gift_type;
    var mail_item_type = -1;
    var mail_item_count = req.body.gift_count;
    var mail_item_message = req.body.gift_message;
    var end_date = req.body.gift_enddate;
    var create_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
    var update_date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
    var flag = 0;
    var user_id = req.body.user_id;



    var notice_item_type_name = req.body.notice_type;
    var notice_item_type = -1;
    var notice_item_count = req.body.notice_count;
    var notice_item_message = req.body.notice_message;
    var notice_end_date = req.body.notice_enddate;

    if (mail_item_type_name != null) {
        mail_item_type = getMailTypeID(mail_item_type_name);
    }
    if ('mail_data_disable' == action) {
        exports.mail_valid(req, res);
    } else if ('mail_data_enable' === action) {
        exports.mail_valid(req, res);
    } else if (action == null || mail_item_type == -1) {
        exports.mail(req, res);
    } else {


        async.waterfall([
            function(callback) {
                if (action == 'notice')
                {
                    createNoticeList(notice_item_type_name, notice_item_count, notice_item_message,notice_end_date, function(err){
                        callback(err);
                    });

                }
                else if (action == 'gift') {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            callback(err);
                        }

                        if (connection) {
                            var mail_data = {};
                            mail_data.mail_item_type = mail_item_type;
                            mail_data.mail_item_count = mail_item_count;
                            mail_data.mail_item_message = mail_item_message;
                            mail_data.end_date = end_date;
                            mail_data.create_date = create_date;
                            mail_data.update_date = update_date;
                            mail_data.flag = flag;
                            mail_data.user_id = user_id;
                            mail_data.mail_type = 'normal';


                            connection.query('INSERT INTO mail SET ?', [mail_data], function(err, result1) {
                                if (err) {
                                    errorcode = -2;
                                    connection.release();
                                    callback(err);
                                } else {
                                    connection.release();
                                    callback(null);
                                }
                            });

                        }
                        else
                        {
                            callback(new Error('connection failed'));
                        }
                    });

                } else {
                    callback(new Error('Error Not Param'));
                }

            }
        ], function(err1) {
            ///////////////////////////////////////////////////////////////////////////////
            // 로그
            var logdata = {};
            logdata.action = action;
            if (err1)
            {
                logdata.error= err1;
                log_manager.log('system_admin', 'mail send failed', logdata)
            }
            else
            {
                var mail_data = {};
                mail_data.mail_item_type = mail_item_type;
                mail_data.mail_item_count = mail_item_count;
                mail_data.user_id = user_id;
                mail_data.mail_type = 'normal';
                logdata.maildata= mail_data;
                log_manager.log('system_admin', 'mail send success', logdata)
            }
            ////////////////////////////////////////////////////////////////////////////


            exports.mail(req, res);
        });
    }

};

exports.mail_valid = function(req, res) {
    var action = req.body.action;

    var mail_data_disable = false;

    if ('mail_data_disable' == action)
        mail_data_disable = true;
    else if ('mail_data_enable' == action)
        mail_data_disable = false;
    else {
        res.redirect('back');
        return;
    }



    var mail_id = req.body.mail_id;
    var user_id = req.body.user_id;
    async.waterfall([

        // update
        function(callback) {
            mysqlconnection(function(err, connection) {
                if (err) {
                    if (connection !== null) {
                        connection.release();
                    }
                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                    callback(err);

                } else {
                    if (connection) {
                        var queryString = '';
                        if (mail_data_disable)
                            queryString = 'UPDATE  mail SET flag=1, update_date=? WHERE mail_id=? AND flag=0';
                        else
                            queryString = 'UPDATE  mail SET flag=0, update_date=? WHERE mail_id=? AND flag=1';

                        connection.query(queryString, [(new Date()).toISOString().substring(0, 19).replace('T', ' '), mail_id], function(err, results) {

                            if (err) {
                                connection.release();
                                console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                callback(err);
                            } else if (results.changedRows != 1) {
                                connection.release();
                                callback(null);
                            } else {
                                connection.release();
                                callback(null);
                            }
                        });
                    } else {
                        if (connection !== null) {
                            connection.release();
                        }
                        callback(null);
                    }
                }
            });
        }
    ], function(err) {
        if (err) {
            console.log(err);
        }

        ///////////////////////////////////////////////////////////////////////////////
        // 로그
        var logdata = {};
        logdata.action = action;
        if (err)
        {
            logdata.error= err;
            log_manager.log('system_admin', 'mail enable or disable error', logdata)
        }
        else
        {
            var mail_data = {};
            mail_data.mail_id = mail_id;
            mail_data.user_id = user_id;
            logdata.maildata= mail_data;
            if ('mail_data_disable' == action)
                log_manager.log('system_admin', 'mail disable', logdata)
            else
                log_manager.log('system_admin', 'mail enable', logdata)
        }
        ////////////////////////////////////////////////////////////////////////////

        if (user_id)
            res.redirect('/webadmin/mail/' + user_id);
        else
            res.redirect('/webadmin/mail/');
    });
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ranking Tab
// exports.ranking = function(req, res) {
//     var action = req.body.action;
//     var stage_id = req.params.stage_id;
//     var redisClient = global.redisClient;
//     var result = {};
//     var temp_data = {};
//
//     result.default_end_date = getMailValidity();
//     var default_start_date = new Date(Date.now());
//     result.default_start_date = default_start_date.toISOString().replace(/T.*$/, '');
//     result.ranking_info_category = 0;
//     result.ranking_info_name = '랭킹';
//
//     if (action == 'remove_ranking') {
//         exports.remove_ranking(req, res);
//         return;
//     }
//     else if (action == 'ranking_create')
//     {
//         exports.ranking_create(req, res);
//     } else if (action == 'remove_ranking_info') {
//
//     }
//     else
//     {
//         async.waterfall([
//             // ranking id List
//             function(callback){
//                 mysqlconnection(function(err, connection) {
//                     if (err) {
//                         callback(null);
//                     }
//                     else{
//                         if (connection) {
//                             connection.query('SELECT * FROM ranking_info WHERE ranking_end_date >= NOW() AND ' +
//                                 'ranking_start_date <= NOW() AND ranking_flag=0',  function(err, rows) {
//                                 if (err) {
//                                     err.errno = -1;
//                                     connection.release();
//                                     callback(null);
//                                 }
//                                 else
//                                 {
//                                     if (rows.length !== 0)
//                                     {
//                                         result.ranking_id_data_list = rows;
//                                     }
//                                     connection.release();
//                                     callback(null);
//                                 }
//                             });
//                         }
//                         else
//                         {
//                             callback(null);
//                         }
//                     }
//                 });
//             },
//             // cache search
//             function(callback) {
//
//                 redisClient.get(stage_id + '_cache', function(err, reply) {
//                     if (err) {
//                         callback(null);
//                     } else {
//                         result.ranking_list = JSON.parse(reply);
//                         callback(new Error('cache found'));
//                     }
//
//                 });
//
//             },
//             // find user list
//             function(callback) {
//
//                 redisClient.ZREVRANGE(stage_id, 0, 99, 'WITHSCORES', function(err, reply) {
//                     if (err) {
//                         callback(err);
//                     } else {
//                         result.ranking_list = []
//                         var count = reply.length;
//                         var j = 1;
//                         for (var i = 0; i < count; i += 2) {
//                             var user_data = {};
//                             user_data.user_id = reply[i];
//                             user_data.score = parseInt(reply[i + 1], 10);
//                             user_data.order = j;
//                             j++;
//                             result.ranking_list.push(user_data);
//                         }
//                         callback(null);
//                     }
//
//                 });
//             },
//
//             function(callback) {
//                 mysqlconnection(function(err, connection) {
//                     if (err) {
//                         console.log('error code : ' + err.errno + 'errorMessage' + err.message);
//                         result.errorCode = err.errno;
//                         result.errorMessage = err.message;
//                         callback(err);
//                     } else {
//                         if (connection) {
//                             var user_ids = [];
//                             for (var i = 0; i < result.ranking_list.length; i++) {
//                                 user_ids.push(result.ranking_list[i].user_id);
//                             }
//                             var myQuery = "SELECT * FROM " + "userinfo" + " WHERE user_id IN ('" + user_ids.join("','") + "')";
//                             connection.query(myQuery, function(err, rows) {
//                                 for (var i = 0; i < result.ranking_list.length; i++) {
//                                     for (var j = 0; j < rows.length; j++) {
//                                         if (result.ranking_list[i].user_id === rows[j].user_id) {
//                                             result.ranking_list[i].facebook_id = rows[j].facebook_id;
//                                             result.ranking_list[i].playgame_id = rows[j].playgame_id;
//                                             result.ranking_list[i].gamecenter_id = rows[j].gamecenter_id;
//                                             result.ranking_list[i].user_name = rows[j].user_name;
//                                         }
//                                     }
//                                 }
//                                 callback(null);
//                             });
//                         }
//                     }
//                 });
//
//             },
//             // data sorting
//             function(callback) {
//
//                 redisClient.set(stage_id + '_cache', JSON.stringify(result.ranking_list), function(err, reply) {
//                     if (err) {
//                         console.log('error code : ' + err.errno + 'errorMessage' + err.message);
//                         result.errorCode = err.errno;
//                         result.errorMessage = err.message;
//                         callback(err);
//                     } else
//                         callback(null);
//                 });
//
//             }
//
//         ], function(err) {
//             if (err) {
//                 if (result.ranking_list != null) {
//                     result.stage_id = stage_id;
//                     res.render('ranking', result);
//                 } else {
//                     result = {};
//                     result.errorCode = err.errno;
//                     result.errorMessage = err.message;
//                     result.stage_id = stage_id;
//                     res.render('ranking', result);
//                 }
//             } else {
//                 result.stage_id = stage_id;
//                 res.render('ranking', result);
//             }
//         });
//     }
//
// };
//
// exports.ranking_create = function(req, res) {
//
// }
//
// // 특정 유저 랭킹에서 삭제
// exports.remove_ranking = function(req, res) {
//     var action = req.body.action;
//     var stage_id = req.body.stage_id;
//     var user_id = req.body.user_id;
//     var redisClient = global.redisClient;
//
//
//     if (action == 'remove_ranking') {
//         async.waterfall([
//                 function(callback) {
//                     redisClient.zrem(stage_id, user_id, function(err) {
//                         ranking.update(function() {
//                             callback(err);
//                         });
//                     });
//                 }
//             ],
//             function(err) {
//                 if (err)
//                     console.log(err.errno + err.message);
//                 if (stage_id)
//                     res.redirect('/webadmin/ranking/' + stage_id);
//                 else
//                     res.redirect('/webadmin/ranking/');
//
//             });
//
//     } else {
//         if (stage_id)
//             res.redirect('/webadmin/ranking/' + stage_id);
//         else
//             res.redirect('/webadmin/ranking/');
//     }
// };
///////////////////////////////////////////////////////////////////////////////////////////
//
exports.log_view = function(req, res) {
    res.render('log_view' );
};
///////////////////////////////////////////////////////////////////////////////////////////
exports.user_data = function(req, res) {
    var account_id = req.params.account_id;
    if (account_id === null || account_id === undefined)
        account_id = req.body.account_id;
    var action = req.body.action;
    var query = '';
    var result = {};
    result.account_id = account_id;


    res.req.body.action = '';
    if (account_id == null) {
        res.render('user_data');
        return;
    } else if (action == 'flag_change') {

        // 데이터 플래그 변경
        if (req.body.action_change == 'flag_disable') {
            query = 'UPDATE userdata SET flag=0 WHERE account_id=? AND flag=1';
        } else {
            query = 'UPDATE userdata SET flag=1 WHERE account_id=? AND flag=0';
        }

        mysqlconnection(function (err, connection) {
            if (err) {
                if (connection !== null) {
                    connection.release();
                }
                console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                result.errorCode = err.errno;
                result.errorMessage = err.message;
                ///////////////////////////////////////////////////////////////////////////////
                // 로그
                var logdata = {};
                logdata.error = result;
                logdata.account_id = account_id;
                log_manager.log('system_db', 'admin user data db connection failed', logdata);
                ////////////////////////////////////////////////////////////////////////////
                res.redirect('/webadmin/user_data/' + account_id);

            } else {
                if (connection) {

                    connection.query(query, [account_id], function (err, results) {
                        if (err) {
                            connection.release();
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);

                            result.errorCode = err.errno;
                            result.errorMessage = err.message;

                            ///////////////////////////////////////////////////////////////////////////////
                            // 로그
                            var logdata = {};
                            logdata.error = result;
                            logdata.account_id = account_id;
                            log_manager.log('system_admin', 'admin user data flag change failed', logdata);
                            ////////////////////////////////////////////////////////////////////////////
                            res.redirect('/webadmin/user_data/' + account_id);
                        } else if (results.changedRows != 1) {
                            connection.release();
                            result.errorCode = -1;
                            ///////////////////////////////////////////////////////////////////////////////
                            // 로그
                            var logdata = {};
                            logdata.error = result;
                            logdata.account_id = account_id;
                            log_manager.log('system_admin', 'admin user data flag change error', logdata);
                            ////////////////////////////////////////////////////////////////////////////
                            res.redirect('/webadmin/user_data/' + account_id);
                        } else {
                            connection.release();
                            result.errorCode = 0;
                            ///////////////////////////////////////////////////////////////////////////////
                            // 로그
                            var logdata = {};
                            logdata.error = result;
                            logdata.account_id = account_id;
                            log_manager.log('system_admin', 'admin user data flag change success', logdata);
                            ////////////////////////////////////////////////////////////////////////////
                            res.redirect('/webadmin/user_data/' + account_id);
                        }
                    });
                }
            }
        });
    } else if (action == 'data_save') {
        var save_data = req.body.user_data;

        async.waterfall([
            function(callback) {
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                        result.errorCode = err.errno;
                        result.errorMessage = err.message;
                        callback(err);
                    } else {
                        if (connection) {
                            var query = 'UPDATE userdata SET flag=1, save_data=? WHERE account_id=? AND flag=0';
                            connection.query(query, [save_data, account_id], function(err, results) {
                                if (err) {
                                    connection.release();
                                    console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                                    result.errorCode = err.errno;
                                    result.errorMessage = err.message;
                                    callback(err);
                                } else if (results.changedRows != 1) {
                                    connection.release();
                                    result.errorCode = -1;
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
            }, function(callback) {
                // 현재 데이터 상태...
                mysqlconnection(function(err, connection) {
                    if (err) {
                        if (connection !== null) {
                            connection.release();
                        }
                        result.errorCode = err.errno;
                        result.errorMessage = err.message;
                        callback(err);
                    } else {
                        if (connection) {
                            connection.query('SELECT * FROM userdata WHERE account_id=?', [account_id], function(err, rows) {
                                if (err) {
                                    connection.release();
                                    result.errorcode = err.errno;
                                    result.errormessage = err.message;
                                    callback(err);
                                } else if (rows.length > 0) {
                                    connection.release();
                                    result.flag = rows[0].flag;
                                    result.save_data = rows[0].save_data;
                                    callback(null);
                                }
                                else
                                {
                                    connection.release();
                                    result.errorcode = -1;
                                    result.errormessage = '검색 실패';
                                    callback(null);
                                }
                            });
                        }
                    }
                });
            }

        ], function(err){
            if (err) {
                result.errorcode = err.errno;
                result.errormessage = err.message;

                ///////////////////////////////////////////////////////////////////////////////
                // 로그
                var logdata = {};
                logdata.error = result;
                logdata.account_id = account_id;
                log_manager.log('system_admin', 'admin user data save error', logdata);
                ////////////////////////////////////////////////////////////////////////////

            }
            else
            {
                ///////////////////////////////////////////////////////////////////////////////
                // 로그
                var logdata = {};
                logdata.account_id = account_id;
                log_manager.log('system_admin', 'admin user data save success', logdata);
                ////////////////////////////////////////////////////////////////////////////
            }
            res.render('user_data' , result);
        });

    } else {

        // 현재 데이터 상태...
        mysqlconnection(function(err, connection) {
            if (err) {
                if (connection !== null) {
                    connection.release();
                }

                result.errorCode = err.errno;
                result.errorMessage = err.message;
                res.render('user_data');
            } else {
                if (connection) {
                    connection.query('SELECT * FROM userdata WHERE account_id=?', [account_id], function(err, rows) {
                        if (err) {
                            connection.release();
                            result.errorcode = err.errno;
                            result.errormessage = err.message;
                            res.render('user_data' , result);
                        } else if (rows.length > 0) {
                            connection.release();
                            result.flag = rows[0].flag;
                            result.save_data = rows[0].save_data;
                            res.render('user_data', result);
                        }
                        else
                        {
                            connection.release();
                            result.errorcode = -1;
                            result.errormessage = '검색 실패';
                            res.render('user_data', result);
                        }
                    });
                }
            }
        });
    }
}