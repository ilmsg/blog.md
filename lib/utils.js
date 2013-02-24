var utils = exports
  , isRegExp = require('util').isRegExp;

/**
 * Recursively copy properties from `src` to `dest` if they don't exist.
 *
 * @param {object} dest
 * @param {object} src
 * @return {object} dest
 * @api public
 */

utils.merge = function (dest, src) {
    Array.prototype.slice.call(arguments, 1).forEach(function (src) {
        for (var i in src) {
            if (typeof dest[i] === "undefined") {
                dest[i] = src[i];
            } else if (typeof dest[i] === "object" && !Array.isArray(dest[i])) {
                utils.merge(dest[i], src[i]);
            }
        }
    });
    return dest;
};

/**
 * Return true if `obj` matches the `query`.
 *
 * @param {Object} obj
 * @param {Object} query
 */

utils.query = function (obj, query) {
    if (!query) {
        return true;
    } else if (!obj || typeof obj !== 'object') {
        return false;
    }
    for (var key in query) {
        if (key === '$andnot' && Array.isArray(query[key])) {
            for (var i = 0, len = query[key].length; i < len; i++) {
                if (utils.query(obj, query[key][i])) {
                    return false;
                }
            }
        } else if (!utils.match(obj[key], query[key])) {
            return false;
        }
    }
    return true;
};

/**
 * Match a value against an expected value.
 *
 * @param {Mixed} value
 * @param {Mixed} expected
 */

utils.match = function (value, expected) {
    if (Array.isArray(value)) {
        for (var i = 0, len = value.length; i < len; i++) {
            if (utils.match(value[i], expected)) {
                return true;
            }
        }
        return false;
    } else if (Array.isArray(expected)) {
        for (var i = 0, len = expected.length; i < len; i++) {
            if (utils.match(value, expected[i])) {
                return true;
            }
        }
        return false;
    } else if (isRegExp(expected)) {
        return expected.test(value);
    } else if (typeof expected === 'object' && '$not' in expected) {
        return !utils.match(value, expected.$not);
    }
    return value == expected;
};

/**
 * A helper for running asynchronous functions in parallel.
 *
 * The `each` fn receives (arg, callback) for each arg in `args`
 * and must call `callback(err = null)` when complete.
 *
 * @param {Array} args
 * @param {Number} concurrency (optional)
 * @param {Function} each
 * @param {Function} callback
 * @api public
 */

utils.parallel = function (args, concurrency, each, callback) {
    if (typeof concurrency === 'function') {
        callback = each;
        each = concurrency;
        concurrency = args.length;
    }
    var len = args.length, pending = len, pos = 0, error;
    if (!len) {
        return callback();
    }
    function next() {
        if (pos >= len) {
            return;
        }
        var arg = args[pos++];
        each(arg, function (err) {
            if (err || error) {
                if (!error) {
                    error = true;
                    callback(err);
                }
                return;
            }
            if (!--pending) {
                return callback();
            }
            process.nextTick(next);
        });
    }
    while (concurrency--) {
        next();
    }
};

/**
 * Check if a string contains only numbers.
 *
 * @param {String} str
 * @return {Boolean} numeric
 * @api public
 */

utils.isNumeric = function (str) {
    return (/^[0-9]+$/).test(str + '');
};

/**
 * Create a set from an array where elements are stored as object keys.
 *
 * @param {Array} arr
 * @return {Object} set
 * @api public
 */

utils.createSet = function (arr) {
    var obj = {};
    arr.forEach(function (elem) {
        obj[elem] = 1;
    });
    return obj;
};

/**
 * Copy an object
 *
 * @param {Object} obj
 * @param {Object} copy
 */

utils.copy = function (obj) {
    var copy = {};
    for (var i in obj) {
        if (typeof obj[i] === 'object') {
            copy[i] = utils.copy(obj[i]);
        } else {
            copy[i] = obj[i];
        }
    }
    return copy;
};

