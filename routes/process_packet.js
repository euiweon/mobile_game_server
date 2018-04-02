/**
 * Created by euiweon on 2017-03-03.
 */
var express = require('express');
var crypto = require('crypto');
var log_manager = require('./log_manager');


////////////////////////////////////////////////
// 패킷 암호화
module.exports.decryption_packet = function(packet_string) {
    var decipher = crypto.createDecipher('seed', global.crypto_password); // Decipher 객체 생성

    decipher.setAutoPadding(true);
    var decipheredOutput = decipher.update(packet_string, 'base64', 'utf8');
    decipheredOutput += decipher.final('utf8');

    var output_Json = JSON.parse(decipheredOutput);
    return output_Json;
};

module.exports.encryption_packet = function(packet_data) {

    var packet_string = JSON.stringify(packet_data);
    // 암호화
    var cipher = crypto.createCipher('seed', global.crypto_password); // Cipher 객체 생성
    cipher.setAutoPadding(true);
    var cipheredOutput = cipher.update(packet_string, 'utf8', 'base64'); // 인코딩 방식에 따라 암호화
    cipheredOutput += cipher.final('base64'); // 암호화된 결과 값


    return cipheredOutput;
};



////////////////////////////////////////////////
// 패킷의 전송 및 수신
module.exports.send_packet = function(res, packet_json) {
    var milliseconds = (new Date).getTime();
    var errorData = {};
    if (packet_json === null) {
        var error_packet = {};

        errorData.errorCode = -10000;
        errorData.errorMessage = 'can not send packet';
        errorData.time = milliseconds;
        error_packet.errorData = errorData;

        //res.send(module.exports.encryption_packet(error_packet));
        res.json(error_packet);
        return;
    }

    if (packet_json.errorCode === null)
        packet_json.errorCode = 0;
    if (packet_json.errorMessage === null)
        packet_json.errorMessage = 'ok';

    errorData.errorCode = packet_json.errorCode;
    errorData.errorMessage = packet_json.errorMessage;
    errorData.time = milliseconds;
    packet_json.errorData = errorData;
    delete packet_json['errorMessage'];
    delete packet_json['errorCode'];
    //res.send(module.exports.encryption_packet(packet_json));
    res.json(packet_json);
};

module.exports.recv_packet = function(req) {
    var _recv_packet_data = {};

    //_recv_packet_data.body = module.exports.decryption_packet(req.body);
    _recv_packet_data.body = req.body;
    _recv_packet_data.params = req.params;

    return _recv_packet_data;
};
//module.exports = router;