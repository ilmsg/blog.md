var marked = require('marked');

/**
 * Create a new blog
 *
 * @param {String} path - the folder containing markdown files
 * @param {Object} options (optional)
 */

var Blog = exports.Blog = function (path, options) {
    this.path = path;
    this.options = options || {};
    this.load();
};

/**
 * Recursively load markdown files in the blog path.
 */

Blog.prototype.load = function () {
    //
};

/**
 * Get blog categories.
 *
 * @return {Array} categories
 */

Blog.prototype.categories = function () {
    //
};

/**
 * Get blog posts.
 *
 * @param {Options} filter
 * @return {Array} posts
 */

Blog.prototype.posts = function (filter) {
    //
};

/**
 * Get a blog post.
 *
 * @param {Number|String} id or slug
 * @return {Object} post
 */

Blog.prototype.post = function (id) {
    //
};

