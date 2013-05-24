var FileSystemLoader = require('./loaders/fs').FileSystemLoader
  , ArrayLoader = require('./loaders/array').ArrayLoader
  , utils = require('./utils')
  , sift = require('sift')
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
    var self = this;
    this.loader.push = function (posts, metadata, full_refresh) {
        if (full_refresh) {
            self.reset();
        } else if (!posts || !utils.length(posts)) {
            for (var key in metadata) {
                self.metadata[key] = metadata[key];
            }
            return;
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
        if (!utils.length(posts)) {
            return;
        }
        self.post_array = self.post_array.filter(function (post) {
            if (post.id in posts) {
                post.next = null;
                post.prev = null;
                return false;
            }
            return true;
        });
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
    var self = this, post, key;

    //Preserve unchanged posts
    var existing = this.post_array.filter(function (post) {
        if (post.id in posts) {
            post.next = null;
            post.prev = null;
            return false;
        }
        return true;
    });

    for (key in posts) {
        post = posts[key];
        post.id = key;

        post.blog = this.metadata;

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

    for (key in metadata) {
        self.metadata[key] = metadata[key];
    }

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
            slug = utils.slug(post.title);
            while (slug in self.index) {
                slug = (post.title + '-' + (i++)).trim('-');
            }
            post.slug = slug;
        }
        self.index[slug] = 0;
        post.next = null;
        post.prev = null;
    });

    //Sort by date descending
    this.post_array.reverse();

    //Build the index
    this.index = {};
    var post_length = this.post_array.length;
    this.post_array.forEach(function (post, index) {
        self.index[post.slug] = index;
        if (index + 1 < post_length) {
            post.next = self.post_array[index + 1];
        }
        if (index) {
            post.prev = self.post_array[index - 1];
        }
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
    var post = null;
    if (slug in self.index) {
        post = self.post_array[self.index[slug]];
    }
    callback(null, post);
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
        var result = [];
        selected.forEach(function (post) {
            post = complete[post.slug];
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

Blog.prototype.postsChain = function (queries, callback) {
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
          , offset = query.offset || 0
          , random_limit;
        if (query.random) {
            random_limit = limit;
            offset = 0;
            limit = 0;
        }
        query = utils.copy(query.query);
        if (seen_posts.length) {
            if (!query.id) {
                query.id = {};
            }
            if (!query.id.$nin) {
                query.id.$nin = [];
            }
            query.id.$nin = query.id.$nin.concat(seen_posts);
        }
        self.posts(query, limit, offset, function (err, posts) {
            if (err) return callback(err);
            if (random_limit) {
                var random_posts = []
                  , position, tmp;
                while (random_limit-- && posts.length) {
                    position = Math.random() * posts.length | 0;
                    if (position > 0) {
                        tmp = posts[position];
                        posts[position] = 0;
                        posts[0] = tmp;
                    }
                    random_posts.push(posts.shift());
                }
                posts = random_posts;
            }
            posts.forEach(function (post) {
                if (post.id) {
                    seen_posts.push(post.id);
                }
            });
            results.push(posts);
            next();
        });
    })();
};

/**
 * Get the total number of posts that match the query.
 *
 * @param {Object} query (optional)
 * @return {Number} count
 */

Blog.prototype.count = function (query) {
    var count = 0;
    var sifter = sift(query);
    for (var i = 0, len = this.post_array.length; i < len; i++) {
        if (!query || sifter.test(this.post_array[i])) {
            count++;
        }
    }
    return count;
};

/**
 * Run a function for each blog post.
 */

Blog.prototype.forEach = function (fn) {
    return this.post_array.forEach(fn);
};

