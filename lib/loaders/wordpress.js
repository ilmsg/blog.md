var format = require('util').format;

/**
 * Create a new wordpress blog loader.
 *
 * @param {MysqlConnection} connection
 * @param {Object} options (optional)
 */

var WordpressLoader = exports.WordpressLoader = function (connection, options) {
    this.db = connection;
    this.options = options || {};
    this.prefix = this.options.prefix || 'wp';
    if (this.options.blog_id) {
        this.prefix += '_' + this.options.blog_id;
    }
    if (this.options.database) {
        this.prefix = format('%s.%s', this.options.database, this.prefix);
    }
};

/**
 * Load the wordpress blog.
 *
 * @param {Function} callback
 */

WordpressLoader.prototype.load = function (callback) {
    var blog = {}
      , posts = {}
      , self = this;

    var select_posts = format('SELECT * FROM %s_posts', this.prefix)
      , select_postmeta = format('SELECT * FROM %s_postmeta', this.prefix)
      , select_options = format('SELECT * FROM %s_options', this.prefix)
      , select_terms = format('SELECT * FROM %s_term_relationships r ' +
            'INNER JOIN %s_term_taxonomy t ON t.term_taxonomy_id = r.term_taxonomy_id ' +
            'INNER JOIN %s_terms c ON c.term_id = t.term_id', this.prefix, this.prefix, this.prefix);

    //Load blog metadata from the options table
    this.db.query(select_options, function (err, rows) {
        if (err) {
            return callback(err);
        }
        rows.forEach(function (row) {
            blog[row.option_name] = row.option_value;
        });

        //Load posts from the posts table
        self.db.query(select_posts, function (err, rows) {
            if (err) {
                return callback(err);
            }
            rows.forEach(function (row) {
                posts[row.ID] = row;
                row.id = row.ID;
                posts[row.ID].meta = {};
                posts[row.ID].terms = {};
                delete row.ID;
            });

            //Load metadata from the postmeta table
            self.db.query(select_postmeta, function (err, rows) {
                if (err) {
                    return callback(err);
                }
                rows.forEach(function (row) {
                    if (!(row.post_id in posts)) {
                        return;
                    }
                    posts[row.post_id].meta[row.meta_key] = row.meta_value;
                });

                //Select post terms (categories, tags, etc)
                self.db.query(select_terms, function (err, rows) {
                    if (err) {
                        return callback(err);
                    }
                    rows.forEach(function (row) {
                        if (!(row.object_id in posts)) {
                            return;
                        }
                        if (!(row.taxonomy in posts[row.object_id].terms)) {
                            posts[row.object_id].terms[row.taxonomy] = [];
                        }
                        posts[row.object_id].terms[row.taxonomy].push(row.name);
                    });

                    //Normalise the incoming data
                    self.normalise(blog, posts, callback);
                });
            });
        });
    });
};

/**
 * Normalise the data coming from wordpress. Called automatically
 * after `load()`.
 *
 * @param {Object} blog - key/value pairs from the wp_options table
 * @param {Object} posts - an object conatining { ..post fields..,
 *                             meta: { ..postmeta fields.. },
 *                             terms: { type: [ name, ... ] } }
 * @param {Function} callback
 */

WordpressLoader.prototype.normalise = function (blog, posts, callback) {
    blog.posts = {};
    for (var id in posts) {
        var post = {};
        for (var field in posts[id]) {
            post[field.replace(/^post_/, '')] = posts[id][field];
        }
        post.date = post.date_gmt;
        post.modified = post.modified_gmt;
        delete post.date_gmt;
        delete post.modified_gmt;
        if (post.title && post.date && post.status === 'publish' && post.type === 'post') {
            blog.posts[id] = post;
        }
    }
    callback(null, blog);
};

/**
 * A static method to load a list of public network blogs.
 *
 * @param {MysqlConnection} connection
 * @param {String} site
 * @param {String} table (optional) - default is 'wp_blogs'
 * @param {Function} callback
 */

WordpressLoader.loadNetwork = function (connection, site, table, callback) {
    if (typeof table === 'function') {
        callback = table;
        table = 'wp_blogs';
    }
    var query = format('SELECT * FROM %s WHERE public = 1 AND ' +
        'path != "/" AND domain LIKE ?', table);
    connection.query(query, [ site ], function (err, blogs) {
        if (err) {
            return callback(err);
        }
        callback(null, blogs.map(function (blog) {
            return { id: blog.blog_id, name: blog.path.replace(/\//g, '') };
        }));
    });
};

