var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var cluster = require('cluster');
var cron = require('cron');
var os = require('os');
var fs = require('fs');
var debug = require('debug')('prototype:server');
var http = require("http");
var https = require("https");
var redis = require("redis");
var compression = require('compression');
var session = require('express-session');
var redisStore = require('connect-redis')(session);
require("./global");



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/////////////////////////////////////////////////////////////////////////
process.env.NODE_ENV = ( process.env.NODE_ENV && ( process.env.NODE_ENV ).trim().toLowerCase() === 'production' )
    ? 'production' : 'development';
//if( process.env.NODE_ENV == 'production' )
{
    var redisClient = redis.createClient(6379, "127.0.0.1");
    app.use(session({
        secret: 'abcdefgTU7PEmAoprt',
        store: new redisStore({
            host: "127.0.0.1",
            port: 6379,
            client: redisClient,
            prefix: "session:",
            db: 0
        }),
        saveUninitialized: true, // don't create session until something stored,
        resave: false // don't save session if unmodified
    }));
}
// else
// {
//     var redisClient = redis.createClient(6203, "euiweonjeong.com");
//     global.redisClient = redisClient;
//     app.use(session({
//         secret: 'abcdefgTU7PEmAoprt',
//         store: new redisStore({
//             host: "euiweonjeong.com",
//             port: 6203,
//             client: redisClient,
//             prefix: "session:",
//             db: 0
//         }),
//         saveUninitialized: false, // don't create session until something stored,
//         resave: true // don't save session if unmodified
//     }));
// }
//


/////////////////////////////////////////////////////////////////////////




var index = require('./routes/index');
var users = require('./routes/users');
var gift = require('./routes/mail');
var save = require('./routes/userdata');
var inapp = require('./routes/inapp');
var ranking = require('./routes/ranking');
var admin = require('./routes/admin');
var coupon1 = require('./routes/coupon');


app.use('/', index);
app.use('/users', users);
app.use('/inapp', inapp);
app.use('/userdata', save);
app.use('/mail', gift);
//app.use('/ranking', ranking);
app.use('/coupon', coupon1);




/////////////////////////////////////////////////////////////////////////





app.get('/webadmin',  admin.main);
app.post('/webadmin',  admin.main_value_change);
app.get('/webadmin/users',  admin.user);
app.get('/webadmin/mail',  admin.mail);
app.get('/webadmin/log',  admin.log_view);
app.get('/webadmin/mail/:user_id',  admin.mail);
app.get('/webadmin/log/:user_id',  admin.log_view);
app.get('/webadmin/users/:user_id',  admin.user);
app.get('/webadmin/user_data',  admin.user_data);
app.get('/webadmin/user_data/:account_id',  admin.user_data);
app.post('/webadmin/mail',  admin.mail);
app.post('/webadmin/mail/:user_id',  admin.mail_send);
app.post('/webadmin/users/:user_id',  admin.user);
app.post('/webadmin/log/:user_id',  admin.log_view);
app.post('/webadmin/user_data/:account_id',  admin.user_data);



/////////////////////////////////////////////////////////////////////////
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});


// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;




/////////////////////////////////////////////////////////////////////////
var port = normalizePort(process.env.PORT || '8080');
app.set('port', port);




function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}


// db url & cpu count
if ('production' === String(app.get('env'))) {
    app.set('process_count', process.env.PROCESS_COUNT || os.cpus().length);
} else {
    app.set('process_count', process.env.PROCESS_COUNT || 1);
}



function onError(error) {
    // if ('production' == app.get('env')) {
    //
    // }
    // else
    {
        if (error.syscall !== 'listen') {
            throw error;
        }

        var bind = typeof port === 'string' ?
            'Pipe ' + port :
            'Port ' + port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

}


var startCronJobs = function() {

    // 랭킹 업데이트
    // new cron.CronJob('0 */5 * * * *', function() {
    // //new cron.CronJob('*/30 * * * * *', function() {
    //     // 랭킹 갱신...
    //     ranking.update(null);
    // }, null, true, 'Asia/Seoul');
    // 유효기간 지난 편지함 처리
    new cron.CronJob('0 0 6 * * *', function() {

    }, null, true, 'Asia/Seoul');
};

function createServer() {


    if (cluster.isMaster) {

        console.log('Starting server', new Date());
        console.log('NODE_ENV:', app.get('env'));
        startCronJobs();
        // Fork workers.
        var count = app.get('process_count');
        while (count-- > 0) {
            cluster.fork();
        }

        cluster.on('exit', function(worker, code, signal) {
            var worker_name = '[' + worker.id + '-' + worker.process.pid + ']';
            console.error(worker_name, 'worker died');
            cluster.fork();
        });

    } else {
        var server = http.createServer(app);

        server.listen(port, function() {
            var worker_name = '[ Worker ID ] ' + cluster.worker.id + '\n[ Worker Process ] ' + cluster.worker.process.pid + '\n';
            console.log(worker_name, '[ Worker Port(No SSL)] : ', app.get('port'));
        });
        server.on('error', onError);
        server.on('listening', function() {

            var addr = server.address();
            var bind = typeof addr === 'string' ?
                'pipe ' + addr :
                'port ' + addr.port;
            debug('Listening on ' + bind);

        });
    }
}




////////////////////////////////////////////////////////////////////////////


createServer();
