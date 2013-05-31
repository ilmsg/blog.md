var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , FileSystemLoader = require('./loaders/fs').FileSystemLoader
  , ArrayLoader = require('./loaders/array').ArrayLoader
  , sift = require('sift')
  , utils = require('./utils')
  , format = require('util').format;

/**
 * Create a new blog.
 *
 * @param {Loader|Array|String} loader
 * @param {Object} options (optional)
 */

function Blog(loader, options) {
    this.slugs = {};
    this.ids = {};
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
    loader.on('load', this.onLoad.bind(this));
    loader.on('new_post', this.onNewPost.bind(this));
    loader.on('updated_post', this.onUpdatedPost.bind(this));
    loader.on('removed_post', this.onRemovedPost.bind(this));
}

inherits(Blog, EventEmitter);

exports.Blog = Blog;

/**
 * Load posts.
 *
 * @param {Array} posts
 */

Blog.prototype.onLoad = function (posts) {
    try {
        this.index(posts);
    } catch (err) {
        this.emit('error', err);
    }
    this.emit('load', this.posts);
};

/**
 * Index posts.
 *
 * @param {Array} posts
 */

Blog.prototype.index = function (posts) {
    var self = this;

    this.length = posts.length;

    var sorted_asc = true
      , sorted_desc = true
      , needs_slug = false;

    posts.forEach(function (post, i) {
        self.checkPost(post);
        self.ids[post.id] = post;

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
            if (!post.slug) {
                post.slug = self.generateSlug(post);
            }
            self.slugs[post.slug] = post;
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
        self.slugs[post.slug] = post;
        self.ids[post.id] = post;
        if (index + 1 < self.length) {
            post.next = posts[index + 1];
        }
        if (index) {
            post.prev = posts[index - 1];
        }
        self.emit('post', post);
    });

    this.posts = posts;
};

/**
 * Check the a post is valid.
 *
 * @param {Object} post
 */

Blog.prototype.checkPost = function (post) {
    if (!('id' in post)) {
        throw new Error('Post does not contain a unique ID');
    }
    if (post.id in this.ids) {
        throw new Error(format('Duplicate post.id (%s)', post.id));
    }
    if (!(post.date instanceof Date)) {
        post.date = new Date(post.date || 'invalid');
    }
    if (!post.title) {
        throw new Error(format('Post does not contain a title (%s)', post.id));
    } else if (!post.date || isNaN(post.date)) {
        throw new Error(format('Post does not contain a valid date (%s)', post.id));
    }
};

/**
 * Generate a unique post slug.
 *
 * @param {Object} post
 * @return {String} slug
 */

Blog.prototype.generateSlug = function (post) {
    var slug_title = post.title.toLowerCase().replace(/[^a-z0-9]/ig, '-');
    slug_title = slug_title.replace(/--+/g, '-').replace(/^-|-$/g, '');
    var slug = slug_title
      , suffix = 2;
    while (slug in this.slugs) {
        if (this.slugs[slug].id === post.id) {
            break;
        }
        slug = (slug_title + '-' + (suffix++)).trim('-');
    }
    return slug;
};

/**
 * Get a blog post.
 *
 * @param {String} slug
 */

Blog.prototype.post = function (slug) {
    return this.slugs[slug];
};

/**
 * Get blog posts.
 *
 * @param {Object} options (optional)
 * @return {Array} posts
 */

var allowed_options = utils.createSet([
    'query', 'limit', 'offset', 'page', 'random', 'fill', 'not'
]);

Blog.prototype.select = function (options) {
    options = options || {};
    for (var key in options) {
        if (!(key in allowed_options)) {
            throw new Error('Unknown select() option: ' + key);
        }
    }
    var query = options.query
      , not = options.not;
    if (not) {
        if (!Array.isArray(not)) {
            not = [ not ];
        }
        if (query) {
            query = utils.copy(query);
            query.id = { $nin: not };
        } else {
            query = { id: { $nin: not } };
        }
    }
    var offset = options.offset
      , limit = options.limit
      , sifter = sift(query)
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
    if (options.fill && posts.length < options.limit) {
        not = (not || []).concat(posts.map(function (post) {
            return post.id;
        }));
        posts = posts.concat(this.select({
            random: true
          , not: not
          , limit: options.limit - posts.length
        }));
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

/**
 * Insert a new post.
 *
 * @param {Object} post
 */

Blog.prototype.onNewPost = function (post) {
    try {
        this.checkPost(post);
    } catch (err) {
        return this.emit('error', err);
    }
    if (!post.slug) {
        post.slug = this.generateSlug(post);
    }
    this.slugs[post.slug] = post;
    this.ids[post.id] = post;
    this.length++;
    if (this.length && post.date >= this.posts[0].date) {
        this.posts.unshift(post);
    } else {
        var position = 0;
        for (var i = 0; i < this.length; i++) {
            if (this.posts[i].date > post.date) {
                position = i;
            } else {
                break;
            }
        }
        this.posts.splice(position + 1, 0, post);
    }
    this.emit('new_post', post);
    this.emit('post', post);
};

/**
 * Handle an updated post.
 *
 * @param {Object} post
 */

Blog.prototype.onUpdatedPost = function (post) {
    var previous = this.ids[post.id];
    if (!previous) {
        return;
    }
    if (!post.slug) {
        post.slug = this.generateSlug(post);
    }
    if (post.slug !== previous.slug) {
        delete this.slugs[previous.slug];
    }
    this.slugs[post.slug] = post;
    post.next = previous.next;
    post.prev = previous.prev;
    this.ids[post.id] = post;
    for (var i = 0; i < this.length; i++) {
        if (this.posts[i].id === post.id) {
            this.posts[i] = post;
            break;
        }
    }
    this.emit('updated_post', post);
    this.emit('post', post);
};

/**
 * Handle a removed post.
 *
 * @param {Object} post
 */

Blog.prototype.onRemovedPost = function (post) {
    var previous = this.ids[post.id];
    if (!previous) {
        return;
    }
    delete this.slugs[previous.slug];
    delete this.ids[post.id];
    var position = null;
    for (var i = 0; i < this.length; i++) {
        if (this.posts[i].id === post.id) {
            position = i;
            break;
        }
    }
    if (previous.next) {
        previous.next.prev = previous.prev;
    }
    if (previous.prev) {
        previous.prev.next = previous.next;
    }
    if (position !== null) {
        this.posts.splice(position, 1);
        this.length--;
    }
    this.emit('removed_post', previous);
};

