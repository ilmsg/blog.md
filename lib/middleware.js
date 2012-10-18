var utils = require('./utils');

/**
 * Create a express middleware for a blog.
 *
 * @param {Blog} blog
 * @param {Object} options (optional)
 */

module.exports = function (blog, options) {
    options = options || {};
    var prefix = options.prefix || '';
    return function (request, response, next) {
        if (prefix && request.url.indexOf(prefix) !== 0) {
            return next();
        }

        //Pop off the querystring
        var url = request.url.split('?')[0].replace(new RegExp('^' + prefix), '') || '/'
          , url_parts = url.split('/').slice(1);

        //Match a post permalink /:year/:month/:slug
        if (url_parts.length === 3) {
            return blog.post(url_parts[2], function (err, post) {
                if (err || !post) {
                    return next(err);
                }
                response.locals({
                    blog: blog.metadata
                  , post: post
                });
                next();
            });
        }

        //Match /, /:year, /:year/:month, /rss, and /atom
        var query = {};
        if (url_parts.length === 2 && utils.isNumeric(url_parts[0]) && utils.isNumeric(url_parts[1])) {
            query.year = Number(url_parts[0]);
            query.month = Number(url_parts[1]);
        } else if (url_parts.length === 1 && utils.isNumeric(url_parts[0])) {
            query.year = Number(url_parts[0]);
        } else if (url !== '/rss' && url !== '/atom' && url !== '/') {
            return next();
        }

        //Handle pagination
        var limit = Number(request.param('limit', options.limit)) || 10
          , page = Number(request.param('page')) || 1
          , offset = (page - 1) * limit;

        blog.posts(query, limit, offset, function (err, posts) {
            if (err || !posts) {
                return next(err);
            }
            response.locals({
                blog: blog.metadata
              , posts: posts
              , page: page
              , limit: limit
            });
            next();
        });
    };
};

