// /**
//  * Created by euiweon on 2017-02-13.
//  */
// var express = require('express');
// var router = express.Router();
// var async = require('async');
// var mysqlconnection = require('./mysqlconnection');
// var redis = require("redis");
// var asyncLoop = require('node-async-loop');
// var process_packet = require('./process_packet');
//
// var log_manager = require('./log_manager');
//
// // 랭킹 추가
// function addRanking(user_id, stage_id, score, result_callback) {
//     var redisClient = global.redisClient;
//     var result = {};
//     result.user_id = user_id;
//     result.stage_id = stage_id;
//     result.score = score;
//
//     async.waterfall([
//         // ranking search
//         function(callback) {
//             redisClient.zscore(stage_id, user_id, function(err, old_score) {
//                 if (!err) {
//                     if (old_score === null)
//                         old_score = 0;
//                     if (old_score < score) {
//                         callback(null);
//                     } else {
//                         var err1 = new Error('Not required score');
//                         err1.errno = -300;
//                         callback(err1);
//                     }
//                 } else {
//                     callback(null);
//                 }
//
//             });
//         },
//         // score add
//         function(callback) {
//             redisClient.zadd(stage_id, score, user_id, function(err) {
//                 if (!err) {
//                     callback(null);
//                 } else
//                     callback(err);
//             });
//         },
//
//         // get my Ranking
//         function(callback) {
//             redisClient.ZREVRANK(stage_id, user_id, function(err, myrank) {
//                 if (!err) {
//                     result.myrank = myrank + 1;
//                     callback(null);
//                 } else {
//                     var err1 = new Error('Not required score');
//                     err1.errno = -301;
//                     callback(err1);
//                 }
//             });
//         }
//
//     ], function(err) {
//         if (err) {
//             result = {};
//             result.errorCode = err.errno;
//             result.errorMessage = err.message;
//             result_callback(result);
//         } else {
//
//             ///////////////////////////////////////////////////////////////////////////////////////////////////////
//             // Log
//             var log = {};
//             log.user_id = result.user_id ;
//             log.stage_id  = result.stage_id;
//             log.score  = result.score;
//             log.rank =  result.myrank;
//             log.action = 'AddRanking';
//             log.action_string = log.stage_id
//                 + ' AddRanking ' +
//                 ' Score : '
//                 +  log.score  +'' +
//                 'Rank :  '+log.rank;
//             log.date = new Date.now();
//             log_manager.log(log);
//             /////////////////////////////////////////////////////////////////////////////////////////////////////
//
//
//             result_callback(result);
//         }
//     });
// }
//
// // 랭킹 가져오기
// function getStageRanking(stage_id, force_refresh, result_callback) {
//     var redisClient = global.redisClient;
//     var result = {};
//
//     async.waterfall([
//         // cache search
//         function(callback) {
//             if (force_refresh) {
//                 callback(null)
//             } else {
//                 redisClient.get(stage_id + '_cache', function(err, reply) {
//                     if (err) {
//                         callback(null);
//                     } else {
//                         result.ranking_list = JSON.parse(reply);
//                         callback(new Error('cache found'));
//                     }
//
//                 });
//             }
//
//         },
//         // find user list
//         function(callback) {
//
//             redisClient.ZREVRANGE(stage_id, 0, 99, 'WITHSCORES', function(err, reply) {
//                 if (err) {
//                     callback(err);
//                 } else {
//                     result.ranking_list = [];
//                     var count = reply.length;
//                     var j = 1;
//                     for (var i = 0; i < count; i += 2) {
//                         var user_data = {};
//                         user_data.user_id = reply[i];
//                         user_data.score = parseInt(reply[i + 1], 10);
//                         user_data.order = j;
//                         j++;
//                         result.ranking_list.push(user_data);
//                     }
//                     callback(null);
//                 }
//
//             });
//         },
//
//         function(callback) {
//             mysqlconnection(function(err, connection) {
//                 if (err) {
//                     console.log('error code : ' + err.errno + 'errorMessage' + err.message);
//                     result.errorCode = err.errno;
//                     result.errorMessage = err.message;
//                     callback(err);
//                 } else {
//                     if (connection) {
//                         var user_ids = [];
//                         for (var i = 0; i < result.ranking_list.length; i++) {
//                             user_ids.push(result.ranking_list[i].user_id);
//                         }
//                         var myQuery = "SELECT * FROM " + "userinfo" + " WHERE user_id IN ('" + user_ids.join("','") + "')";
//                         connection.query(myQuery, function(err, rows) {
//                             for (var i = 0; i < result.ranking_list.length; i++) {
//                                 for (var j = 0; j < rows.length; j++) {
//                                     if (result.ranking_list[i].user_id === rows[j].user_id) {
//                                         result.ranking_list[i].facebook_id = rows[j].facebook_id;
//                                         result.ranking_list[i].playgame_id = rows[j].playgame_id;
//                                         result.ranking_list[i].gamecenter_id = rows[j].gamecenter_id;
//                                         result.ranking_list[i].user_name = rows[j].user_name;
//                                     }
//                                 }
//                             }
//                             callback(null);
//                         });
//                     }
//                 }
//             });
//
//         },
//         // data sorting
//         function(callback) {
//
//             redisClient.set(stage_id + '_cache', JSON.stringify(result.ranking_list), function(err) {
//                 if (err) {
//                     console.log('error code : ' + err.errno + 'errorMessage' + err.message);
//                     result.errorCode = err.errno;
//                     result.errorMessage = err.message;
//                     callback(err);
//                 } else
//                     callback(null);
//             });
//
//         }
//
//     ], function(err) {
//         if (err) {
//             if (result.ranking_list !== null) {
//                 result.stage_id = stage_id;
//                 result_callback(result);
//             } else {
//                 result = {};
//                 result.errorCode = err.errno;
//                 result.errorMessage = err.message;
//                 result.stage_id = stage_id;
//                 result_callback(result);
//             }
//         } else {
//             result.stage_id = stage_id;
//             result_callback(result);
//         }
//     });
// }
//
//
// /**
//  * @api {post} /ranking/addranking 랭킹 추가
//  * @apiName 랭킹리스트 등록
//  * @apiGroup Ranking
//  * @apiVersion 1.0.0
//  *
//  * @apiParam {String} user_id  유저의 고유 ID
//  * @apiParam {String} stage_id  랭킹 분류 ID
//  * @apiParam {int32} score  점수
//  *
//  *
//  * @apiSuccess {String} user_id 유저 ID
//  * @apiSuccess {String} stage_id  랭킹 분류 ID
//  * @apiSuccess {int32} score  점수
//  * @apiSuccess {int32} myrank 랭킹내 나의 등수
//  *
//  *
//  * @apiSuccess {Object} errorData  에러 메세지 정보
//  * @apiSuccess {int32} errorData.errorCode  에러 코드
//  * @apiSuccess {String} errorData.errorMessage  에러 메세지
//  * @apiSuccess {int64} errorData.time  현재시간
//  *
//  * @apiError {Object} errorData  에러 메세지 정보
//  * @apiError {int32} errorData.errorCode  에러 코드
//  * @apiError {String} errorData.errorMessage  에러 메세지
//  * @apiError {int64} errorData.time  현재시간
//  */
//
// router.post('/addranking', function(req, res) {
//     var _packet_data = process_packet.recv_packet(req);
//     var user_id = _packet_data.body.user_id;
//     var stage_id = _packet_data.body.stage_id;
//     var score = _packet_data.body.score;
//
//     addRanking(user_id, stage_id, score, function(result_data) {
//         process_packet.send_packet(res, result_data);
//     });
// });
//
// /**
//  * @api {post} /ranking/get_stage_ranking 랭킹리스트 가져오기
//  * @apiName 랭킹리스트 가져오기
//  * @apiGroup Ranking
//  * @apiVersion 1.0.0
//  *
//  * @apiParam {String} user_id  유저의 고유 ID
//  * @apiParam {String} stage_id  랭킹 분류 ID
//  *
//  *
//  * @apiSuccess {String} user_id 유저 ID
//  * @apiSuccess {String} stage_id  랭킹 분류 ID
//  * @apiSuccess {Object[]} ranking_list  랭킹리스트
//  * @apiSuccess {String} ranking_list.user_id  유저 ID
//  * @apiSuccess {String} ranking_list.score  유저 점수
//  * @apiSuccess {String} ranking_list.order  유저 등수
//  * @apiSuccess {String} ranking_list.facebook_id  페이스북 고유 ID
//  * @apiSuccess {String} ranking_list.playgame_id  구글 플레이 게임의 고유 ID
//  * @apiSuccess {String} ranking_list.gamecenter_id  애플 게임센터의 고유 ID
//  * @apiSuccess {String} ranking_list.user_name  유저의 닉네임
//  *
//  * @apiSuccess {Object} errorData  에러 메세지 정보
//  * @apiSuccess {int32} errorData.errorCode  에러 코드
//  * @apiSuccess {String} errorData.errorMessage  에러 메세지
//  * @apiSuccess {int64} errorData.time  현재시간
//  *
//  * @apiError {Object} errorData  에러 메세지 정보
//  * @apiError {int32} errorData.errorCode  에러 코드
//  * @apiError {String} errorData.errorMessage  에러 메세지
//  * @apiError {int64} errorData.time  현재시간
//  */
// router.post('/get_stage_ranking', function(req, res) {
//     var _packet_data = process_packet.recv_packet(req);
//     var stage_id = _packet_data.body.stage_id;
//     var user_id = _packet_data.body.user_id;
//     var force_refresh = false;
//     var redisClient = global.redisClient;
//     if (_packet_data.body.force_refresh !== null) {
//         force_refresh = _packet_data.body.force_refresh;
//     }
//
//     getStageRanking(stage_id, force_refresh, function(result_data) {
//         // User rank
//         if (user_id !== null) {
//
//             redisClient.zrevrank(stage_id, user_id, function(err, myrank) {
//                 if (!err) {
//                     result_data.myrank = myrank + 1;
//                 }
//                 process_packet.send_packet(res, result_data);
//             });
//         } else {
//             process_packet.send_packet(res, result_data);
//         }
//
//     });
// });
//
// module.exports = router;
//
// // 랭킹 업데이트
// module.exports.update = function(nextfunction) {
//     var redisClient = global.redisClient;
//     if (parseInt(global.ranking_id_list.length) !== 0) {
//         // 전체 리스트 갱신
//
//         var id_list = [];
//         for (var j = 0; j < global.ranking_id_list.length; j++) {
//             id_list.push(global.ranking_id_list[j].ID);
//         }
//
//         asyncLoop(id_list, function(item, next) {
//             var result = {};
//             var stage_id = item;
//             async.waterfall([
//                 // 등수와 점수, User_ID를 정령
//                 function(callback) {
//                     redisClient.ZREVRANGE(stage_id, 0, 99, 'WITHSCORES', function(err, reply) {
//                         if (err) {
//                             callback(err);
//                         } else {
//                             result.ranking_list = [];
//                             var count = reply.length;
//                             var j = 1;
//                             for (var i = 0; i < count; i += 2) {
//                                 var user_data = {};
//                                 user_data.user_id = reply[i];
//                                 user_data.score = parseInt(reply[i + 1], 10);
//                                 user_data.order = j;
//                                 j++;
//                                 result.ranking_list.push(user_data);
//                             }
//                             callback(null);
//                         }
//
//                     });
//                 },
//                 // 사용자들의 정보를 조회
//                 function(callback) {
//                     mysqlconnection(function(err, connection) {
//                         if (err) {
//                             console.log('error code : ' + err.errno + 'errorMessage' + err.message);
//                             result.errorCode = err.errno;
//                             result.errorMessage = err.message;
//                             callback(err);
//                         } else {
//                             if (connection) {
//                                 var user_ids = [];
//                                 for (var i = 0; i < result.ranking_list.length; i++) {
//                                     user_ids.push(result.ranking_list[i].user_id);
//                                 }
//                                 var myQuery = "SELECT * FROM " + "userinfo" + " WHERE user_id IN ('" + user_ids.join("','") + "')";
//                                 connection.query(myQuery, function(err, rows) {
//                                     for (var i = 0; i < result.ranking_list.length; i++) {
//                                         for (var j = 0; j < rows.length; j++) {
//                                             if (result.ranking_list[i].user_id === rows[j].user_id) {
//                                                 result.ranking_list[i].facebook_id = rows[j].facebook_id;
//                                                 result.ranking_list[i].playgame_id = rows[j].playgame_id;
//                                                 result.ranking_list[i].gamecenter_id = rows[j].gamecenter_id;
//                                                 result.ranking_list[i].user_name = rows[j].user_name;
//                                             }
//                                         }
//                                     }
//                                     callback(null);
//                                 });
//                             }
//                         }
//                     });
//                 },
//                 // 랭킹을 요청할때 마다 매번 DB 조회를 하지 않기 위해서
//                 // Redis에다가 cache를 만들어 사용한다.
//                 function(callback) {
//                     redisClient.set(stage_id + '_cache', JSON.stringify(result.ranking_list), function(err) {
//                         if (err) {
//                             console.log('error code : ' + err.errno + 'errorMessage' + err.message);
//                             result.errorCode = err.errno;
//                             result.errorMessage = err.message;
//                             callback(err);
//                         } else
//                             callback(null);
//                     });
//                 }
//
//             ], function(err) {
//                 if (err) {
//                     console.log(err.errno + err.message);
//                     if (result.ranking_list !== null) {
//                         next();
//                     } else {
//                         result = {};
//                         next();
//                     }
//                 } else {
//                     next();
//                 }
//             });
//         }, function() {
//             console.log("Refresh OK");
//             if (nextfunction !== null)
//                 nextfunction();
//         });
//     } else {
//         console.log("Refresh false");
//     }
// }