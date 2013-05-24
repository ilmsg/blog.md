var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , sift = require('sift')
  , utils = require('./utils');

/**
 * Create a new blog network.
 *
 * @param {Object} blogs (optional) - { blog_name: Blog, ... }
 */

function Network(blogs) {
    this.blogs = {};
    this.reset();
    this.pending = 0;
    for (var name in (blogs || {})) {
        this.add(name, blogs[name]);
    }
}

inherits(Network, EventEmitter);

exports.Network = Network;

/**
 * Add a blog to the network.
 *
 * @param {String} blog_name
 * @param {Blog} blog
 */

Network.prototype.add = function (blog_name, blog) {
    this.blogs[blog_name] = blog;
    var self = this;
    this.pending++;
    blog.on('load', function (posts) {
        self.normalise(blog_name, posts);
        if (!--self.pending) {
            self.emit('load', self.post_array);
        }
    });
    blog.on('error', function (err) {
        self.emit('error', err);
    });
};

/**
 * Normalise incoming blog posts.
 *
 * @param {String} blog_name
 * @param {Array} posts
 */

Network.prototype.normalise = function (blog_name, posts) {
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
        return post;
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
    var selected = [], sifter = sift(query);
    for (var i = 0, len = this.post_array.length, count = 0; i < len; i++) {
        if (!query || sifter.test(this.post_array[i])) {
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
            complete[post.blog_name + ':' + post.slug] = post;
            next();
        });
    }, function (err) {
        if (err) {
            return callback(err);
        }
        var result = [];
        selected.forEach(function (post) {
            post = complete[post.blog_name + ':' + post.slug];
            if (post) {
                result.push(post);
            }
        });
        callback(null, result);
    });

};

/**
 * Chain queries together.
 *
 * Each successive query excludes the results from previous queries,
 * i.e. each post in the resulting arrays are unique.
 *
 * @param {Array} queries - an array of objects containing
 *                          { query: <obj>, limit: ?, offset: ? }
 * @param {Function} callback - receives err and an argument for each query
 */

Network.prototype.postsChain = function (queries, callback) {
    var results = []
      , seen_posts = []
      , self = this;
    (function next() {
        if (!queries.length) {
            results.unshift(null); //err
            return callback.apply(null, results);
        }
        var query = queries.shift()
          , limit = query.limit || 0
          , offset = query.offset || 0;
        query = utils.copy(query.query);
        if (seen_posts.length) {
            if (!('$not' in query)) {
                query.$not = {};
            }
            query.$not.$or = seen_posts;
        }
        self.posts(query, limit, offset, function (err, posts) {
            if (err) return callback(err);
            posts.forEach(function (post) {
                seen_posts.push({ blog_name: post.blog_name, id: post.id });
            });
            results.push(posts);
            next();
        });
    })();
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
    return utils.length(this.blogs);
};

/**
 * Reset the network.
 */

Network.prototype.reset = function () {
    this.post_array = [];
};

