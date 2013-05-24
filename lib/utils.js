var utils = exports;

/**
 * Recursively copy properties from `src` to `dest` if they don't exist.
 *
 * @param {object} dest
 * @param {object} src
 * @return {object} dest
 * @api public
 */

utils.merge = function (dest) {
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
 * Use setImmediate if available.
 */

utils.nextTick = typeof setImmediate === 'function' ? setImmediate : process.nextTick;

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
    var len = args.length, pending = len, pos = 0, error
      , stack = 0;
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
                return utils.nextTick(callback);
            }
            if (++stack % 100 === 0) {
                utils.nextTick(next);
            } else {
                next();
            }
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
        if (Array.isArray(obj[i])) {
            copy[i] = obj[i].map(function (element) {
                return element;
            });
        } else if (typeof obj[i] === 'object') {
            copy[i] = utils.copy(obj[i]);
        } else {
            copy[i] = obj[i];
        }
    }
    return copy;
};

/**
 * Get the number of elements in an object.
 *
 * @param {Object} obj
 * @return {Number} length
 */

utils.length = function (obj) {
    var length = 0;
    for (var key in obj) {
        length++;
    }
    return length;
};

