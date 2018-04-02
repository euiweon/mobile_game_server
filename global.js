/**
 * Created by euiweon on 2017-02-07.
 */
global.servername = require('./package.json').name;
global.redisClient = null;
global.server_version = require('./package.json').version;

global.ranking_id_list = require('./data/ranking_id_list.json').data;
global.mail_type_list = require('./data/mail_type_list.json').data;

global.crypto_password = 'XMKNum9mH5J5';

global.mysql_url = ""
global.mysql_user = "mgw_gameserver"
global.mysql_password = "password"
global.mysql_db_name = "mgw_game_db"