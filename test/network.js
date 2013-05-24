var assert = require('assert')
  , format = require('util').format
  , Blog = require('../').Blog
  , Network = require('../').Network;

describe('Network', function () {

    it('should propagate blog loading errors', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
        ]));
        network.add('barblog', new Blog([
            { id: 2, title: 'a' /* missing date */ }
        ]));
        network.on('error', function () {
            done();
        });
    });

    it('should select posts aggregated from all blogs', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-03' }
          , { id: 3, title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { id: 1, title: 'a', date: '2012-10-02' }
          , { id: 2, title: 'b', date: '2012-10-04' }
          , { id: 3, title: 'c', date: '2012-10-06' }
        ]));
        network.on('load', function () {
            network.posts(function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 6);
                assert.equal(selected[0].title, 'c');
                assert.equal(selected[1].title, 'bar');
                assert.equal(selected[2].title, 'b');
                assert.equal(selected[3].title, 'foo');
                assert.equal(selected[4].title, 'a');
                assert.equal(selected[5].title, 'foo');
                done();
            });
        });
    });

    it('should select posts while respecting a limit and offset parameter', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-03' }
          , { id: 3, title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { id: 1, title: 'a', date: '2012-10-02' }
          , { id: 2, title: 'b', date: '2012-10-04' }
          , { id: 3, title: 'c', date: '2012-10-06' }
        ]));
        network.on('load', function () {
            network.posts(null, 3, 1, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 3);
                assert.equal(selected[0].title, 'bar');
                assert.equal(selected[0].blog_name, 'fooblog');
                assert.equal(selected[1].title, 'b');
                assert.equal(selected[1].blog_name, 'barblog');
                assert.equal(selected[2].title, 'foo');
                done();
            });
        });
    });

    it('should select posts while respecting a limit and offset parameter', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foobar', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-03' }
          , { id: 3, title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { id: 1, title: 'a', date: '2012-10-02' }
          , { id: 2, title: 'b', date: '2012-10-04' }
          , { id: 3, title: 'c', date: '2012-10-06' }
        ]));
        network.on('load', function () {
            network.posts(null, null, 1, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 5);
                assert.equal(selected[0].title, 'bar');
                assert.equal(selected[0].blog_name, 'fooblog');
                assert.equal(selected[1].title, 'b');
                assert.equal(selected[1].blog_name, 'barblog');
                assert.equal(selected[2].title, 'foo');
                assert.equal(selected[2].blog_name, 'fooblog');
                assert.equal(selected[3].title, 'a');
                assert.equal(selected[3].blog_name, 'barblog');
                assert.equal(selected[4].title, 'foobar');
                assert.equal(selected[4].blog_name, 'fooblog');
                done();
            });
        });
    });

    it('should select posts using a query', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foo', date: '2012-10-01', category: 'bar' }
          , { id: 2, title: 'foo', date: '2012-10-03' }
          , { id: 3, title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { id: 1, title: 'a', date: '2012-10-02' }
          , { id: 2, title: 'b', date: '2012-10-04', category: 'bar' }
          , { id: 3, title: 'c', date: '2012-10-06' }
        ]));
        network.on('load', function () {
            network.posts({ category: 'bar' }, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 2);
                assert.equal(selected[0].title, 'b');
                assert.equal(selected[1].title, 'foo');
                selected.forEach(function (post) {
                    assert.equal(post.category, 'bar');
                });
                done();
            });
        });
    });

    it('should chain queries together', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foo', date: '2012-10-05', category: 'bar' }
          , { id: 2, title: 'bar', date: '2012-10-03', category: 'bar' }
          , { id: 3, title: 'baz', date: '2012-10-01', category: 'foo' }
        ]));
        network.add('barblog', new Blog([
            { id: 1, title: 'a', date: '2012-10-06', category: 'foobar' }
          , { id: 2, title: 'b', date: '2012-10-04', category: 'bar' }
          , { id: 3, title: 'c', date: '2012-10-02', category: 'foobar' }
        ]));
        network.on('load', function () {
            network.postsChain([
                { query: { category: 'bar' } }
              , { query: { blog_name: 'barblog' }, limit: 1 }
              , { query: { blog_name: 'fooblog' }, limit: 1 }
            ], function (err, a, b, c) {
                assert(!err, err);
                assert(Array.isArray(a));
                assert(Array.isArray(b));
                assert(Array.isArray(c));
                assert.equal(a.length, 3);
                assert.equal(b.length, 1);
                assert.equal(c.length, 1);
                assert.equal(a[0].title, 'foo');
                assert.equal(a[1].title, 'b');
                assert.equal(a[2].title, 'bar');
                assert.equal(b[0].title, 'a');
                assert.equal(c[0].title, 'baz');
                done();
            });
        });
    });

    it('should use post.match() if available', function (done) {
        function match(category) {
            return this.category === category;
        }
        var network = new Network();
        network.add('fooblog', new Blog([
            { id: 1, title: 'foo', date: '2012-10-05', category: 'bar', match: match }
          , { id: 2, title: 'bar', date: '2012-10-03', category: 'bar', match: match }
          , { id: 3, title: 'baz', date: '2012-10-01', category: 'foo', match: match }
        ]));
        network.add('barblog', new Blog([
            { id: 1, title: 'a', date: '2012-10-06', category: 'foobar', match: match }
          , { id: 2, title: 'b', date: '2012-10-04', category: 'bar', match: match }
          , { id: 3, title: 'c', date: '2012-10-02', category: 'foobar', match: match }
        ]));
        network.on('load', function () {
            network.posts('bar', function (err, posts) {
                assert(!err, err);
                assert(Array.isArray(posts));
                assert.equal(posts[0].title, 'foo');
                assert.equal(posts[1].title, 'b');
                assert.equal(posts[2].title, 'bar');
                done();
            });
        });
    });

});

