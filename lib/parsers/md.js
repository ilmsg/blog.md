var marked = require('marked');

module.exports = function (str, callback) {
    try {
        callback(null, marked(str));
    } catch (e) {
        callback(e);
    }
};

