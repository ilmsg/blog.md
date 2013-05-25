var utils = exports;

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
 * Create a slug from a string.
 *
 * @param {String} str
 * @return {String} slug
 */

utils.slug = function (str) {
    var slug = str.toLowerCase().replace(/[^a-z0-9]/ig, '-');
    return slug.replace(/--+/g, '-').replace(/^-|-$/g, '');
};

