var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , sift = require('sift');

/**
 * Create a new blog network.
 *
 * @param {Object} blogs (optional) - { name: Blog, ... }
 */

function Network(blogs) {
    this.blogs = {};
    this.loading = 0;
    this.count = 0;
    this.blog_names = [];
    blogs = blogs || {};
    for (var name in blogs) {
        this.add(name, blogs[name]);
    }
}

inherits(Network, EventEmitter);

exports.Network = Network;

/**
 * Add a blog to the network.
 *
 * @param {String} name
 * @param {Blog} blog
 */

Network.prototype.add = function (name, blog) {
    this.blogs[name] = blog;
    this.blog_names.push(name);
    var self = this;
    this.loading++;
    this.count++;
    blog.on('load', function (posts) {
        posts.forEach(function (post) {
            post.blog_name = name;
        });
        if (!--self.loading) {
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
 * @param {Object} options (optional)
 * @return {Array} posts
 */

Network.prototype.select = function (options) {
    options = options || {};
    var selected = [], sifter = sift(options.query)
      , post, match, count = 0
      , offset = options.offset
      , limit = options.limit
      , positions = {}
      , self = this;
    if (options.page && limit) {
        offset = (options.page - 1) * limit;
    }
    function nextPost() {
        var latest, selected_blog;
        self.blog_names.forEach(function (blog) {
            var position = positions[blog] || (positions[blog] = 0)
              , post = self.blogs[blog].posts[position];
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
    while ((post = nextPost())) {
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
            selected.push(post);
            if (limit && ++count === limit) {
                break;
            }
        }
    }
    return selected;
};

