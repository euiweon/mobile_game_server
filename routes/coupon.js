/**
 * Created by Eui-Weon on 2017-05-31.
 */
var express = require('express');

var async = require('async');
var crypto = require('crypto');
var mysqlconnection = require('./mysqlconnection');
var router = express.Router();
var log_manager = require('./log_manager');

router.post('/vaild_coupon',  function(req, res) {
    var signed_value = req.body.signed_value;
    var usn = req.body.usn;
    var reward_key = req.body.reward_key;
    var quantity = req.body.quantity;
    var campaign_key = req.body.campaign_key;
    var text = usn + reward_key + quantity+campaign_key;ㅋ
    var hashkey = 'ecb349bf02bb43d7';
    var hash_output = crypto.createHmac('md5', hashkey).update(text).digest('hex');

    var logdata = {};
    logdata.reward_count = reward_key;
    logdata.coupon_type = campaign_key;

    //console.log('usn :' + usn);
    if (signed_value === hash_output)
    {
        async.waterfall([
                // 중복 처리가 있는지
                function(cb1) {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }

                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(errorData);
                            return;
                        }

                        else if (connection) {
                            connection.query('SELECT * FROM coupon_info WHERE user_id=? AND campaign_key=?', [usn, campaign_key ], function(err, rows) {
                                if ( rows === null || parseInt(rows.length) === 0) {
                                    connection.release();
                                    cb1(null);
                                } else {
                                    connection.release();
                                    var errorData = {};
                                    errorData.Result = false;
                                    errorData.ResultCode = 3100;
                                    errorData.ResultMsg = 'duplicate transaction';
                                    cb1(errorData);
                                }
                            });
                        }
                        else
                        {
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(err);
                        }
                    });
                },

                // 쿠폰 정보 DB에 등록
                function(cb1) {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(errorData);
                        }

                        else if (connection) {
                            var coupon_data = {};
                            coupon_data.reward_key = reward_key;
                            coupon_data.quantity = quantity;
                            coupon_data.campaign_key = campaign_key;
                            coupon_data.user_id = usn;


                            connection.query('INSERT INTO coupon_info SET ?', [coupon_data], function (err) {
                                if (err) {
                                    //errorcode = -2;
                                    connection.release();
                                    var errorData = {};
                                    errorData.Result = false;
                                    errorData.ResultCode = 4000;
                                    errorData.ResultMsg = 'DB query Error';
                                    cb1(errorData);
                                } else {
                                    connection.release();
                                    cb1(null);
                                }
                            });

                        }
                        else
                        {
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(err);
                        }
                    });
                },
                // 존재하는 User ID인지...
                function (cb1) {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(err);
                        }
                        else if (connection)
                        {
                            connection.query('SELECT * FROM userinfo WHERE user_id=?', [user_id], function(err, rows) {

                                if (rows.length == 0) {
                                    connection.release();
                                    errorData.Result = false;
                                    errorData.ResultCode = 4000;
                                    errorData.ResultMsg = 'not found  user_id';
                                    cb1(errorData);
                                } else {
                                    connection.release();
                                    callback(null);
                                }
                            });
                        }  else {
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(err);
                        }
                    });
                },
                // 쿠폰 보상 처리
                function (cb1) {
                    mysqlconnection(function(err, connection) {
                        if (err) {
                            if (connection !== null) {
                                connection.release();
                            }
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(err);
                        }

                        else if (connection) {
                            var date = new Date;
                            //date.setDate(date.getDate() - 60);
                            var mail_data = {};
                            mail_data.mail_item_type = global.mail_type_list[0].type;
                            mail_data.mail_item_count = quantity;
                            mail_data.mail_item_message = 'Coupon Reward';

                            mail_data.create_date = date;
                            mail_data.update_date = date;

                            date.setDate(date.getDate() +  60);
                            mail_data.end_date = date;

                            mail_data.flag = 0;
                            mail_data.user_id = usn;
                            mail_data.mail_type = 'normal';


                            connection.query('INSERT INTO mail SET ?', [mail_data], function(err) {
                                if (err) {
                                    errorcode = -2;
                                    connection.release();

                                    var errorData = {};
                                    errorData.Result = false;
                                    errorData.ResultCode = 4000;
                                    errorData.ResultMsg = 'DB query Error';
                                    cb1(errorData);

                                } else {
                                    connection.release();
                                    cb1(null);
                                }
                            });

                        }
                        else {
                            console.log('error code : ' + err.errno + 'errorMessage' + err.message);
                            var errorData = {};
                            errorData.Result = false;
                            errorData.ResultCode = 4000;
                            errorData.ResultMsg = 'DB Connection Error';
                            cb1(err);
                        }
                    });
                }],
            function(err) {
                if (err) {
                    console.log(err);
                    logdata.error = err;
                    logdata.user_id = usn;
                    log_manager.log('system_coupon', 'coupon reward failed', logdata);
                    res.json(err);
                }
                else
                {
                    var errorData = {};
                    errorData.Result = true;
                    errorData.ResultCode = 1;
                    errorData.ResultMsg = 'success';
                    log_manager.log(usn, 'coupon reward success', logdata);
                    res.json(errorData);
                }
            });
    }
    else
    {
        var errorData = {};
        errorData.Result = false;
        errorData.ResultCode = 1100;
        errorData.ResultMsg = 'invalid hash key';
        logdata.error = errorData;
        log_manager.log('system_coupon', 'coupon reward failed', logdata);
        res.json(errorData);
    }
});
module.exports = router;
