/**
 * Created by euiweon on 2017-02-08.
 */
// Don't forget ' connection.release();
var mysql = require('mysql');


var mysqlpool_release = mysql.createPool({
    connectionLimit: 20,
    host: global.mysql_url ,
    port: 3306,
    user: global.mysql_user,
    waitForConnections:false,
    password : global.mysql_password,
    database: global.mysql_db_name
});

var mysqlpool = mysqlpool_release;

var getConnection = function(callback) {
    if( String(process.env.NODE_ENV) === 'production' ) {
        mysqlpool_release.getConnection(function(err, connection) {
            callback(err, connection);
        });
    }
    else
    {
        mysqlpool.getConnection(function(err, connection) {
            callback(err, connection);
        });
    }

};

module.exports = getConnection;