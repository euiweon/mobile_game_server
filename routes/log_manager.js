/**
 * Created by euiweon on 2017-03-07.
 */

module.exports.log = function(_user_id, _action, _log_data) {

    var date =  new Date;
    var user_id = _user_id;
    var action = _action;
    var logOutput = JSON.stringify(_log_data);
    console.log(user_id, logOutput);
};

// 0 : 성공
// -1 : DB 에러
// -100 : 이미 존재하는 user_id라 생성이 불가 (device_id가 존재함)
// -101 : User_id 생성 실패
// -102 : 로그인 에러
// -103 : 미사용
// -200 : account_id나 save_data가 존재하지 않음
// -201 : 저장된 데이터를 찾을수 없음
// -202 : 저장 오류
// -203 : 변경된 항목이 1개 이상(account_id의 중복이 발생)
// -204 : 불러오기 오류
// -300 : 랭킹에 등록된 점수보다 크지 않은 점수 입력
// -400 : 이미 받은 우편
// -401 : mail_id를 찾을수 없음.
// -402 : 일반우편 모두 받기 에러
// -10000 : 전송할 패킷이 존재 하지 않아서 처리 불가
