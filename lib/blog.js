var FileSystemLoader = require('./loaders/fs').FileSystemLoader
  , utils = require('./utils')
  , format = require('util').format;

/**
 * Default options
 */

var default_options = {
    query: utils.query
};

/**
 * Create a new blog.
 *
 * @param {Loader|String} loader - or path for the default FileSytemLoader
 * @param {Object} options (optional)
 */

var Blog = exports.Blog = function (loader, options) {
    this.loader = loader.replace(/\/$/, '');
    this.options = utils.merge(options || {}, default_options);
    if (typeof this.loader === 'string') {
        this.loader = new FileSystemLoader(this.loader, this.options);
    }
    this.reset();
};

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

Blog.prototype.load = function (callback) {
    this.reset();
    var self = this;
    this.loader.load(function (err, blog) {
        if (err) {
            return callback(err);
        }

        //Parse post dates
        self.posts = Object.keys(blog.posts).map(function (key) {
            var post = blog.posts[key];
            if (!(post.date instanceof Date)) {
                post.date = new Date(post.date || 'invalid');
            }
            return post;
        });

        //Verify all posts have a valid title and date
        if (self.options.required_keys) {
            for (var i = 0, len = self.posts.length; i < len; i++) {
                if (!post.title) {
                    return callback(format('Post does not contain a title (%s)', self.posts[i].id));
                } else if (isNaN(self.posts[i].date)) {
                    return callback(format('Post does not contain a valid date (%s)', self.posts[i].id));
                }
            }
        }

        //Sort posts (date descending by default)
        self.posts.sort(self.options.sort || function (a, b) {
            return a.date < b.date;
        });

        //Give posts a unique slug, then build an index
        self.posts.forEach(function (post, index) {
            var slug = utils.slug(post.title), i = 1;
            while (slug in self.index) {
                slug = (post.id + '-' + (i++)).trim('-');
            }
            post.id = slug;
            self.index[post.id] = index;
            return post;
        });

        delete blog.posts;
        self.metadata = blog;
        callback();
    });
};

/**
 * Get blog posts.
 *
 * @param {Object} query (optional)
 * @param {Number} limit (optional)
 * @param {Number} offset (optional)
 * @return {Array} posts
 */

Blog.prototype.posts = function (query, limit, offset) {
    if (typeof query === 'function') {
        callback = query;
        query = null;
        limit = 0;
        offset = 0;
    } else if (typeof limit === 'function') {
        callback = limit;
        limit = 0;
        offset = 0;
    } else if (typeof offset === 'function') {
        callback = offset;
        offset = 0;
    }
    var expected = offset + limit
      , query_fn = this.options.query
      , selected = [];
    for (var i = 0, len = this.posts.length, count = 0; i < len; i++) {
        if (query_fn(this.posts[i], query)) {
            selected.push(this.posts[i]);
            count++;
            if (expected && count === expected) {
                break;
            }
        }
    }
    return !expected ? selected : selected.slice(offset, expected);
};

/**
 * Get a blog post.
 *
 * @param {String} slug
 * @return {Object} post
 */

Blog.prototype.post = function (slug) {
    if (!(slug in this.index)) {
        return callback('Unknown post ' + slug);
    }
    return this.posts[this.index[slug]];
};

/**
 * Get blog metadata.
 *
 * @return {Object} metadata
 */

Blog.prototype.metadata = function () {
    return this.metadata;
};

/**
 * Get a unique set of keys from each post.
 *
 * @param {String} key - e.g. 'category'
 * @return {Array} key_set
 */

Blog.prototype.keys = function (key, callback) {
    var keys = {};
    key = key.toLowerCase();
    this.posts.forEach(function (post) {
        if (!(key in post)) {
            return;
        }
        if (Array.isArray(post[key])) {
            post[key].forEach(function (value) {
                keys[value] = 1;
            });
        } else if (typeof post[key] !== 'object') {
            keys[post[key]] = 1;
        }
    });
    return Object.keys(keys);
};

/**
 * Reset the blog.
 */

Blog.prototype.reset = function () {
    this.metadata = {};
    this.index = {};
    this.posts = [];
};

