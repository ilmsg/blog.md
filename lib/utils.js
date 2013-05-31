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

