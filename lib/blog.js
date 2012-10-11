var FileSystemLoader = require('./loaders/fs').FileSystemLoader;

/**
 * Create a new blog.
 *
 * @param {Loader|String} loader - or path for the default FileSytemLoader
 * @param {Object} options (optional)
 */

var Blog = exports.Blog = function (loader, options) {
    this.loader = loader.replace(/\/$/, '');
    this.options = options || {};
    if (typeof this.loader === 'string') {
        this.loader = new FileSystemLoader(this.loader, this.options);
    }
};

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

Blog.prototype.load = function (callback) {
    this.loader.load(function (err, posts) {
        if (err) {
            return callback(err);
        }
        //TODO
        callback();
    });
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

