var FileSystemLoader = require('./loaders/fs').FileSystemLoader
  , ArrayLoader = require('./loaders/array').ArrayLoader
  , utils = require('./utils')
  , format = require('util').format;

/**
 * Default options
 */

var default_options = {
    concurrency: 10
};

/**
 * Create a new blog.
 *
 * @param {Loader|Array|String} loader - or folder containing blog posts, an
 *                                       array of posts, or a custom loader
 * @param {Object} options (optional)
 */

var Blog = exports.Blog = function (loader, options) {
    this.loader = loader;
    this.options = utils.merge(options || {}, default_options);
    if (typeof this.loader === 'string') {
        this.loader = new FileSystemLoader(this.loader, this.options);
    } else if (Array.isArray(this.loader)) {
        this.loader = new ArrayLoader(this.loader, this.options.metadata || {});
    }
    this.reset();
};

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

Blog.prototype.load = function (callback) {
    var self = this;
    this.loader.load(function (err, blog) {
        if (err) {
            return callback(err);
        }

        self.reset();

        //Parse post dates
        self.post_array = Object.keys(blog.posts).map(function (key) {
            var post = blog.posts[key];
            if (!(post.date instanceof Date)) {
                post.date = new Date(post.date || 'invalid');
            }
            return post;
        });

        //Verify all posts have a valid title and date
        for (var i = 0, len = self.post_array.length; i < len; i++) {
            if (!self.post_array[i].title) {
                return callback(format('Post does not contain a title (%s)', self.post_array[i].id));
            } else if (!self.post_array[i].date || isNaN(self.post_array[i].date)) {
                return callback(format('Post does not contain a valid date (%s)', self.post_array[i].id));
            }
        }

        //Add derived fields
        self.post_array.forEach(function (post) {
            post.day = post.date.getDay();
            post.month = post.date.getMonth() + 1;
            post.year = post.date.getFullYear();
            post.year_month = post.year + '-' + post.month;
        });

        //Sort posts by date
        self.post_array.sort(function (a, b) {
            return a.date > b.date;
        });

        //Give posts a unique slug, starting from the earliest post
        self.post_array.forEach(function (post) {
            var slug = self.slug(post.title), i = 2;
            while (slug in self.index) {
                slug = (post.title + '-' + (i++)).trim('-');
            }
            self.index[slug] = 0;
            post.id = slug;
        });

        //Sort by date descending
        self.post_array.reverse();

        //Build an index
        self.post_array.forEach(function (post, index) {
            self.index[post.id] = index;
            return post;
        });

        delete blog.posts;
        self.metadata = blog;

        callback();
    });
};

/**
 * Get a blog post.
 *
 * @param {String} slug
 * @param {Function} callback
 */

Blog.prototype.post = function (slug, callback) {
    var self = this;
    //Note: fetching the post may be async in future
    process.nextTick(function () {
        if (!(slug in self.index)) {
            return callback('Unknown post ' + slug);
        }
        callback(null, self.post_array[self.index[slug]]);
    });
};

/**
 * Get blog posts.
 *
 * @param {Object} query (optional)
 * @param {Number} limit (optional)
 * @param {Number} offset (optional)
 * @param {Function} callback
 */

Blog.prototype.posts = function (query, limit, offset, callback) {
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
      , selected = [];
    for (var i = 0, len = this.post_array.length, count = 0; i < len; i++) {
        if (utils.query(this.post_array[i], query)) {
            selected.push(this.post_array[i]);
            count++;
            if (expected && count === expected) {
                break;
            }
        }
    }
    if (!selected.length) {
        return callback(null, []);
    }
    if (expected) {
        selected = selected.slice(offset, expected);
    }
    var complete = {}, self = this;
    utils.parallel(selected, this.options.concurrency, function (post, next) {
        self.post(post.id, function (err, post) {
            if (err) {
                return next(err);
            }
            complete[post.id] = post;
            next();
        });
    }, function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, selected.map(function (post) {
            return complete[post.id];
        }));
    });

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

Blog.prototype.keys = function (key) {
    key = key.toLowerCase();
    if (key in this.key_cache) {
        return this.key_cache[key];
    }
    var keys = {};
    this.post_array.forEach(function (post) {
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
    return this.key_cache[key] = Object.keys(keys);
};

/**
 * Create a slug from a string.
 *
 * @param {String} str
 * @return {String} slug
 */

Blog.prototype.slug = function (str) {
    var slug = str.toLowerCase().replace(/[^a-z0-9]/ig, '-');
    return slug.replace(/--+/g, '-').replace(/^-|-$/g, '');
};

/**
 * Run a function for each post.
 *
 * @param {Function} fn
 */

Blog.prototype.forEach = function (fn) {
    this.post_array.forEach(fn);
};

/**
 * Reset the blog.
 */

Blog.prototype.reset = function () {
    this.metadata = {};
    this.index = {};
    this.post_array = [];
    this.key_cache = {};
};

