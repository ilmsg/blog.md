/**
 * Create a new array loader.
 *
 * @param {Array} posts
 * @param {Object} metadata (optional)
 */

var ArrayLoader = exports.ArrayLoader = function (posts, metadata) {
    this.metadata = metadata || {};
    this.posts = posts;
};

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

ArrayLoader.prototype.load = function (callback) {
    var self = this;
    process.nextTick(function () {
        self.metadata.posts = self.posts;
        callback(null, self.metadata);
    });
};

