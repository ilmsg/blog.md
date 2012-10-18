var assert = require('assert')
  , express = require('express')
  , supertest = require('supertest')
  , blogmd = require('../')
  , Blog = blogmd.Blog
  , middleware = blogmd.middleware;

function request(blog, options) {
    var app = express();
    app.get('*', middleware(blog, options), function (request, response) {
        if (response.locals.post) {
            response.send(response.locals.post.title);
        } else if (response.locals.posts) {
            response.send(response.locals.posts.map(function (post) {
                return post.title;
            }).join('\n'));
        } else {
            response.send(404);
        }
    });
    return supertest(app);
}

describe('Middleware', function () {

    it('should load all blog posts', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/')
              .expect(200, 'bar\nfoo\nfoobar', done);
        });
    });

    it('should load all blog posts using a limit', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/?limit=2')
              .expect(200, 'bar\nfoo', done);
        });
    });

    it('should load all blog posts on a certain page', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/?limit=1&page=2')
              .expect(200, 'foo', done);
        });
    });

    it('should load all blog posts by year', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/2012')
              .expect(200, 'bar\nfoo', done);
        });
    });

    it('should load all blog posts by year and month', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-09-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/2012/10')
              .expect(200, 'bar', done);
        });
    });

    it('should load a post by it\'s permalink', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-09-01' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/2011/10/foobar')
              .expect(200, 'foobar', done);
        });
    });

    it('should respond to an rss route', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/rss')
              .expect(200, 'bar\nfoo\nfoobar', done);
        });
    });

    it('should respond to an atom route', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog)
              .get('/atom')
              .expect(200, 'bar\nfoo\nfoobar', done);
        });
    });

    it('should support a custom default limit', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog, { limit: 2 })
              .get('/')
              .expect(200, 'bar\nfoo', done);
        });
    });

    it('should support a custom blog prefix A', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog, { prefix: '/myblog' })
              .get('/myblog')
              .expect(200, 'bar\nfoo\nfoobar', done);
        });
    });

    it('should support a custom blog prefix A', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'bar', date: '2012-10-02' }
          , { title: 'foobar', date: '2011-10-02' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            request(blog, { prefix: '/myblog' })
              .get('/myblog/2012/10/bar')
              .expect(200, 'bar', done);
        });
    });

});

