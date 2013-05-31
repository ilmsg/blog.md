var utils = exports;

/**
 * Copy an object.
 *
 * @param {Object} obj
 * @return {Object} copy
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

/**
 * Create a set from an array where elements are stored as object keys.
 *
 * @param {Array} arr
 * @return {Object} set
 * @api public
 */

utils.createSet = function createSet(arr) {
    var obj = {};
    arr.forEach(function (elem) {
        obj[elem] = 1;
    });
    return obj;
};

