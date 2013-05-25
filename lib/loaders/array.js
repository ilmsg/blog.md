var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits;

/**
 * Create a new array loader.
 *
 * @param {Array} posts
 */

function ArrayLoader(posts) {
    var self = this;
    process.nextTick(function () {
        self.emit('load', posts);
    });
}

inherits(ArrayLoader, EventEmitter);

exports.ArrayLoader = ArrayLoader;

