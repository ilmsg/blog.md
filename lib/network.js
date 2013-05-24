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
    this.post_array = [];
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
        posts.forEach(function (post) {
            post.blog_name = blog_name;
        });
        if (!--self.pending) {
            self.emit('load', self.post_array);
        }
    });
    blog.on('error', function (err) {
        self.emit('error', err);
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
    var selected = [], sifter = sift(query)
      , blogs = Object.keys(this.blogs)
      , positions = {}
      , self = this;
    function nextPost() {
        var latest, selected_blog;
        blogs.forEach(function (blog) {
            var position = positions[blog] || (positions[blog] = 0)
              , post = self.blogs[blog].post_array[position];
            if (!post || (latest && post.date < latest.date)) {
                return;
            }
            selected_blog = blog;
            latest = post;
        });
        if (selected_blog) {
            positions[selected_blog]++;
        }
        return latest;
    }

    var post, match, count = 0;
    while ((post = nextPost())) {
        if (!query) {
            match = true;
        } else if (typeof post.match === 'function') {
            match = post.match(query);
        } else {
            match = sifter.test(post);
        }
        if (match) {
            if (offset) {
                offset--;
                continue;
            }
            selected.push(post);
            if (limit && ++count === limit) {
                break;
            }
        }
    }
    if (!selected.length) {
        return callback(null, []);
    }
    var complete = {};
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
 * @param {Function} fn - receives (blog)
 */

Network.prototype.forEach = function (fn) {
    for (var name in this.blogs) {
        fn(this.blogs[name]);
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

