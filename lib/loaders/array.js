var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits;

/**
 * Create a new array loader.
 *
 * @param {Array} posts
 * @param {Object} metadata (optional)
 */

function ArrayLoader(posts, metadata) {
    this.metadata = metadata || {};
    this.posts = posts;
    var self = this;
    process.nextTick(function () {
        self.emit('load', self.posts, self.metadata);
    });
}

inherits(ArrayLoader, EventEmitter);

exports.ArrayLoader = ArrayLoader;

