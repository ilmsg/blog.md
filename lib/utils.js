var utils = exports
  , isRegExp = require('util').isRegExp;

/**
 * Create a slug from a string.
 *
 * @param {String} str
 * @return {String} slug
 */

utils.slug = function (str) {
    var slug = str.toLowerCase().replace(/[^a-z0-9]/ig, '-');
    return slug.replace(/--+/g, '-').replace(/^-|-$/g, '');
};

/**
 * Recursively copy properties from `src` to `dest` if they don't exist.
 *
 * @param {object} dest
 * @param {object} src
 * @return {object} dest
 * @api public
 */

utils.merge = function (dest, src) {
    for (var i in src) {
        if (typeof dest[i] === "undefined") {
            dest[i] = src[i];
        } else if (typeof dest[i] === "object" && !Array.isArray(dest[i])) {
            utils.merge(dest[i], src[i]);
        }
    }
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
        if (!utils.match(obj[key], query[key])) {
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
    if (value === expected) {
        return true;
    }
    if (Array.isArray(value)) {
        for (var i = 0, len = value.length; i < len; i++) {
            if (!util.match(value[i], expected)) {
                return false;
            }
        }
    } else if (isRegExp(query[key]) && !query[key].test(obj[key])) {
        return false;
    } else if (obj[key] != query[key]) {
        return false;
    }
    return true;
};

