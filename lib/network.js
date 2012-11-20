var utils = require('./utils')
  , format = require('util').format;

/**
 * Create a new blog network.
 *
 * @param {Object} blogs (optional) - { blog_name: Blog, ... }
 */

var Network = exports.Network = function (blogs) {
    this.mapper = null;
    this.blogs = {};
    this.reset();
    for (var name in (blogs || {})) {
        this.add(name, blogs[name]);
    }
};

/**
 * Add a blog to the network.
 *
 * @param {String} blog_name
 * @param {Blog} blog
 */

Network.prototype.add = function (blog_name, blog) {
    this.blogs[blog_name] = blog;
    var self = this;
    blog.push = function (posts) {
        self.normalise(blog_name, posts);
    };
};

/**
 * Load all blogs in the network.
 *
 * @param {Function} callback
 */

Network.prototype.load = function (callback) {
    var self = this;
    utils.parallel(Object.keys(this.blogs), 4, function (name, next) {
        self.blogs[name].load(next);
    }, callback);
};

/**
 * Normalise incoming blog posts.
 *
 * @param {String} blog_name
 * @param {Array} posts
 */

Network.prototype.normalise = function (blog_name, posts) {
    var blog = this.blogs[blog_name]
      , self = this;

    //Preserve existing posts
    var existing = [];
    for (var i = 0, len = this.post_array.length; i < len; i++) {
        if (this.post_array[i].blog_name !== blog_name) {
            existing.push(this.post_array[i]);
        }
    }

    //Filter posts
    posts.map(function (post) {
        post.blog_name = blog_name;
        if (!self.mapper) {
            return post;
        }
        return self.mapper(post);
    }).filter(function (post) {
        return !!post;
    });

    this.post_array = existing.concat(posts);

    //Sort posts by date descending
    this.post_array.sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
    });
};

/**
 * Get blog posts from all network blogs.
 *
 * @param {Object} query (optional)
 * @param {Number} limit (optional)
 * @param {Number} offset (optional)
 * @param {Function} callback
 */

Network.prototype.posts = function (query, limit, offset, callback) {
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
    var selected = [];
    for (var i = 0, len = this.post_array.length, count = 0; i < len; i++) {
        if (utils.query(this.post_array[i], query)) {
            if (offset) {
                offset--;
                continue;
            }
            selected.push(this.post_array[i]);
            if (limit && ++count === limit) {
                break;
            }
        }
    }
    if (!selected.length) {
        return callback(null, []);
    }
    var complete = {}, self = this;
    utils.parallel(selected, 10, function (post, next) {
        self.post(post.blog_name, post.slug, function (err, post) {
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
        }));
    });

};

/**
 * Get a blog post.
 *
 * @param {String} blog_name
 * @param {String} slug
 * @param {Function} callback
 */

Network.prototype.post = function (blog_name, slug, callback) {
    if (!(blog_name in this.blogs)) {
        return callback('Unknown blog ' + blog_name);
    }
    this.blogs[blog_name].post(slug, callback);
};

/**
 * Get a unique set of keys from each post.
 *
 * @param {String} key - e.g. 'category'
 * @return {Array} key_set
 */

Network.prototype.keys = function (key) {
    key = key.toLowerCase();
    if (key in this.key_cache) {
        return this.key_cache[key];
    }
    var keys = {};
    this.forEach(function (blog) {
        blog.keys(key).forEach(function (key) {
            keys[key] = 1;
        });
    });
    return this.key_cache[key] = Object.keys(keys);
};

/**
 * Transform posts after loading.
 *
 * @param {Function} fn
 */

Network.prototype.map = function (fn) {
    this.mapper = fn;
};

/**
 * Run a function for each blog.
 *
 * @param {Function} fn - receives (blog) or (name, blog) depending on arity
 */

Network.prototype.forEach = function (fn) {
    var name;
    if (fn.length === 1) {
        for (name in this.blogs) {
            fn(this.blogs[name]);
        }
    } else {
        for (name in this.blogs) {
            fn(name, this.blogs[name]);
        }
    }
};

/**
 * Get the number of blogs in the network.
 *
 * @return {Number} blog_count
 */

Network.prototype.count = function () {
    return Object.keys(this.blogs).length;
};

/**
 * Reset the network.
 */

Network.prototype.reset = function () {
    this.post_array = [];
    this.key_cache = {};
};

