/**
 * Created by euiweon on 2017-02-27.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// logs
var userlog_schema = new Schema({
    user_id: {
        type: String,
        index: true
    },
    time: {
        type: Date,
        default: Date.now
    },
    action: String,
    type: Schema.Types.Mixed
});

mongoose.model('user_log', userlog_schema);