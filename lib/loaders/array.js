/**
 * Create a new array loader.
 *
 * @param {Array} posts
 * @param {Object} metadata (optional)
 */

var ArrayLoader = exports.ArrayLoader = function (posts, metadata) {
    this.metadata = metadata || {};
    this.posts = posts;
    this.push = function () {};
};

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

ArrayLoader.prototype.load = function (callback) {
    var self = this;
    process.nextTick(function () {
        try {
            self.push(self.posts, self.metadata, true);
        } catch (e) {
            return callback(e);
        }
        callback();
    });
};

