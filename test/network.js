var lib_dir = process.env.JS_COV ? '../lib-cov/': '../lib/';

var assert = require('assert')
  , Blog = require(lib_dir + 'blog').Blog
  , Network = require(lib_dir + 'network').Network;

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
            var posts = network.select();
            assert.equal(posts.length, 6);
            assert.equal(posts[0].title, 'c');
            assert.equal(posts[1].title, 'bar');
            assert.equal(posts[2].title, 'b');
            assert.equal(posts[3].title, 'foo');
            assert.equal(posts[4].title, 'a');
            assert.equal(posts[5].title, 'foo');
            assert.equal(network.count(), 6);
            done();
        });
    });

    it('should select posts while respecting a limit and offset parameter', function (done) {
        var network = new Network({
            fooblog: new Blog([
                { id: 1, title: 'foo', date: '2012-10-01' }
              , { id: 2, title: 'foo', date: '2012-10-03' }
              , { id: 3, title: 'bar', date: '2012-10-05' }
            ]),
            barblog: new Blog([
                { id: 1, title: 'a', date: '2012-10-02' }
              , { id: 2, title: 'b', date: '2012-10-04' }
              , { id: 3, title: 'c', date: '2012-10-06' }
            ])
        });
        network.on('load', function () {
            var posts = network.select({ limit: 3, offset: 1 });
            assert.equal(posts.length, 3);
            assert.equal(posts[0].title, 'bar');
            assert.equal(posts[1].title, 'b');
            assert.equal(posts[2].title, 'foo');
            posts = network.select({ limit: '3', offset: '1' });
            assert.equal(posts.length, 3);
            done();
        });
    });

    it('should handle bad input', function (done) {
        var network = new Network({
            fooblog: new Blog([
                { id: 1, title: 'foo', date: '2012-10-01' }
              , { id: 2, title: 'foo', date: '2012-10-03' }
              , { id: 3, title: 'bar', date: '2012-10-05' }
            ]),
            barblog: new Blog([
                { id: 1, title: 'a', date: '2012-10-02' }
              , { id: 2, title: 'b', date: '2012-10-04' }
              , { id: 3, title: 'c', date: '2012-10-06' }
            ])
        });
        network.on('load', function () {
            assert.equal(network.select({ limit: 3, offset: -1 }).length, 0);
            assert.equal(network.select({ limit: -3, offset: 1 }).length, 0);
            assert.equal(network.select({ limit: 3, page: -1 }).length, 0);
            done();
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
            { id: 4, title: 'a', date: '2012-10-02' }
          , { id: 5, title: 'b', date: '2012-10-04' }
          , { id: 6, title: 'c', date: '2012-10-06' }
        ]));
        network.on('load', function () {
            var posts = network.select({ limit: 3, page: 2 });
            assert.equal(posts.length, 3);
            assert.equal(posts[0].id, 2);
            assert.equal(posts[1].id, 4);
            assert.equal(posts[2].id, 1);
            done();
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
            var posts = network.select({ offset: 1 });
            assert.equal(posts.length, 5);
            assert.equal(posts[0].title, 'bar');
            assert.equal(posts[1].title, 'b');
            assert.equal(posts[2].title, 'foo');
            assert.equal(posts[3].title, 'a');
            assert.equal(posts[4].title, 'foobar');
            done();
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
            var posts = network.select({ query: { category: 'bar' }});
            assert.equal(posts.length, 2);
            assert.equal(posts[0].title, 'b');
            assert.equal(posts[1].title, 'foo');
            posts.forEach(function (post) {
                assert.equal(post.category, 'bar');
            });
            assert.equal(network.count({ query: { category: 'bar' }}), 2);
            done();
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
            var posts = network.select({ query: 'bar' });
            assert(Array.isArray(posts));
            assert.equal(posts.length, 3);
            assert.equal(posts[0].title, 'foo');
            assert.equal(posts[1].title, 'b');
            assert.equal(posts[2].title, 'bar');
            done();
        });
    });

    it('should throw an error if an unknown select() option is passed', function () {
        assert.throws(function () {
            Network.prototype.select({ foo: 'bar' });
        });
    });

});

