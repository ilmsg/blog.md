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
    this.mapper = null;
    this.options = utils.merge(options || {}, default_options);
    if (typeof this.loader === 'string') {
        this.loader = new FileSystemLoader(this.loader, this.options);
    } else if (Array.isArray(this.loader)) {
        this.loader = new ArrayLoader(this.loader, this.options.metadata || {});
    }
    var self = this;
    this.loader.push = function (posts, metadata, full_refresh) {
        if (full_refresh) {
            self.reset();
        }
        self.normalise(posts, metadata, function (err) {
            if (err) throw err;
            if (self.push) {
                self.push(self.post_array);
            }
        });
    };
    this.loader.remove = function (posts) {
        if (typeof posts !== 'object') {
            if (!Array.isArray(posts)) {
                posts = [ posts ];
            }
            posts = utils.createSet(posts);
        }
        var existing = [];
        for (i = 0, len = self.post_array.length; i < len; i++) {
            if (!(self.post_array[i].id in posts)) {
                existing.push(self.post_array[i]);
            }
        }
        self.post_array = existing;
        self.indexPosts();
        if (self.push) {
            self.push(self.post_array);
        }
    };
    this.reset();
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

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

Blog.prototype.load = function (callback) {
    this.loader.load(callback);
};

/**
 * Normalise and store incoming blog posts.
 *
 * @param {Array} object
 * @param {Object} metadata
 * @param {Function} callback
 */

Blog.prototype.normalise = function (posts, metadata, callback) {
    var self = this, i, len, post;

    //Preserve unchanged posts
    var existing = [];
    for (i = 0, len = this.post_array.length; i < len; i++) {
        if (!(this.post_array[i].id in posts)) {
            existing.push(this.post_array[i]);
        }
    }

    for (var key in posts) {
        post = posts[key];
        post.id = key;

        //Parse post dates
        if (!(post.date instanceof Date)) {
            post.date = new Date(post.date || 'invalid');
        }

        //Verify all posts have a valid title and date
        var err;
        if (!post.title) {
            err = new Error(format('Post does not contain a title (%s)', post.id));
            return callback(err);
        } else if (!post.date || isNaN(post.date)) {
            err = new Error(format('Post does not contain a valid date (%s)', post.id));
            return callback(err);
        }

        //Add derived fields
        post.day = post.date.getDay();
        post.month = post.date.getMonth() + 1;
        post.year = post.date.getFullYear();
        post.year_month = post.year + '-' + post.month;

        existing.push(post);
    }

    this.post_array = existing;

    this.indexPosts();

    //Run the user-defined mapper function
    if (this.mapper) {
        this.post_array = this.post_array.map(this.mapper);
    }

    this.metadata = metadata || {};

    callback();
};

/**
 * Index posts.
 */

Blog.prototype.indexPosts = function () {
    var self = this;
    this.key_cache = {};

    //Sort by date
    this.post_array.sort(function (a, b) {
        return a.date > b.date ? 1 : -1;
    });

    //Give posts a unique slug, starting from the earliest post
    this.post_array.forEach(function (post) {
        var slug = post.slug, i = 2;
        if (!slug) {
            slug = self.slug(post.title);
            while (slug in self.index) {
                slug = (post.title + '-' + (i++)).trim('-');
            }
            post.slug = slug;
        }
        self.index[slug] = 0;
    });

    //Sort by date descending
    this.post_array.reverse();

    //Build the index
    this.index = {};
    this.post_array.forEach(function (post, index) {
        self.index[post.slug] = index;
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
        var post = null;
        if (slug in self.index) {
            post = self.post_array[self.index[slug]];
        }
        callback(null, post);
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
        self.post(post.slug, function (err, post) {
            if (err) {
                return next(err);
            }
            complete[post.slug] = post;
            next();
        });
    }, function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, selected.map(function (post) {
            return complete[post.slug];
        }).filter(function (post) {
            return !!post;
        }));
    });

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
 * Transform posts after loading.
 *
 * @param {Function} fn
 */

Blog.prototype.map = function (fn) {
    this.mapper = fn;
};

/**
 * Run a function for each blog post.
 */

Blog.prototype.forEach = function (fn) {
    return this.post_array.forEach(fn);
};

