var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , FileSystemLoader = require('./loaders/fs').FileSystemLoader
  , ArrayLoader = require('./loaders/array').ArrayLoader
  , utils = require('./utils')
  , sift = require('sift')
  , format = require('util').format;

/**
 * Create a new blog.
 *
 * @param {Loader|Array|String} loader
 * @param {Object} options (optional)
 */

function Blog(loader, options) {
    this.slugs = {};
    this.posts = [];
    this.length = 0;
    options = options || {};
    if (typeof loader === 'string') {
        loader = new FileSystemLoader(loader, options);
    } else if (Array.isArray(loader)) {
        loader = new ArrayLoader(loader);
    }
    var self = this;
    loader.on('error', function (err) {
        self.emit('error', err);
    });
    loader.on('load', function (posts) {
        try {
            self.posts = self.index(posts);
        } catch (err) {
            self.emit('error', err);
        }
        self.emit('load', self.posts);
    });
}

inherits(Blog, EventEmitter);

exports.Blog = Blog;

/**
 * Index posts.
 *
 * @param {Array} posts
 * @return {Array}
 */

Blog.prototype.index = function (posts) {
    var self = this;

    this.length = posts.length;

    var sorted_asc = true
      , sorted_desc = true
      , needs_slug = false;

    posts.forEach(function (post, i) {

        //Check for a valid title and date on each post
        if (!(post.date instanceof Date)) {
            post.date = new Date(post.date || 'invalid');
        }
        if (!post.title) {
            throw new Error(format('Post does not contain a title (%s)', post.id));
        } else if (!post.date || isNaN(post.date)) {
            throw new Error(format('Post does not contain a valid date (%s)', post.id));
        }

        //Do we need to generate slugs?
        needs_slug = needs_slug || !post.slug;

        //Is the array already sorted?
        if (i) {
            sorted_asc = sorted_asc && posts[i].date > posts[i - 1].date;
            sorted_desc = sorted_desc && posts[i].date < posts[i - 1].date;
        }
    });

    if (needs_slug) {

        //Sort by date ascending
        if (sorted_desc) {
            posts.reverse();
        } else if (!sorted_asc) {
            posts.sort(function (a, b) {
                return a.date > b.date ? 1 : -1;
            });
        }

        //Give posts a unique slug, starting from the earliest post
        posts.forEach(function (post) {
            var slug = post.slug, i = 2, slug_title;
            if (!slug) {
                slug = slug_title = utils.slug(post.title);
                while (slug in self.slugs) {
                    slug = (slug_title + '-' + (i++)).trim('-');
                }
                post.slug = slug;
            }
            self.slugs[slug] = true;
        });

        //Sort by date descending
        posts.reverse();

    } else if (sorted_asc) {
        posts.reverse();
    } else if (!sorted_desc) {
        posts.sort(function (a, b) {
            return a.date > b.date ? -1 : 1;
        });
    }

    //Build the index
    posts.forEach(function (post, index) {
        self.slugs[post.slug] = index;
        if (index + 1 < self.length) {
            post.next = posts[index + 1];
        }
        if (index) {
            post.prev = posts[index - 1];
        }
    });

    return posts;
};

/**
 * Get a blog post.
 *
 * @param {String} slug
 */

Blog.prototype.post = function (slug) {
    var self = this;
    var post = null, index;
    if (slug in self.slugs) {
        index = self.slugs[slug];
        post = self.posts[index];
    }
    return post;
};

/**
 * Get blog posts.
 *
 * @param {Object} options (optional)
 * @return {Array} posts
 */

Blog.prototype.select = function (options) {
    options = options || {};
    var offset = options.offset
      , limit = options.limit
      , sifter = sift(options.query)
      , posts = [];
    if (options.page && limit) {
        offset = (options.page - 1) * limit;
    }
    if (options.random) {
        limit = 0;
        offset = 0;
    }
    for (var i = 0, post, match, count = 0; i < this.length; i++) {
        post = this.posts[i];
        if (!options.query) {
            match = true;
        } else if (typeof post.match === 'function') {
            match = post.match(options.query);
        } else {
            match = sifter.test(post);
        }
        if (match) {
            if (offset) {
                offset--;
                continue;
            }
            posts.push(post);
            if (limit && ++count === limit) {
                break;
            }
        }
    }
    if (options.random) {
        limit = options.limit || posts.length;
        var random_posts = [], position, tmp;
        while (limit-- && posts.length) {
            position = Math.random() * posts.length | 0;
            if (position > 0) {
                tmp = posts[position];
                posts[position] = posts[0];
                posts[0] = tmp;
            }
            random_posts.push(posts.shift());
        }
        posts = random_posts;
    }
    return posts;
};

/**
 * Get the total number of posts that match the query.
 *
 * @param {Object} options (optional)
 * @return {Number} count
 */

Blog.prototype.count = function (options) {
    return this.select(options).length;
};

