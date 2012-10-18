var assert = require('assert')
  , format = require('util').format
  , Blog = require('../').Blog
  , Network = require('../').Network;

describe('Network', function () {

    it('should propagate blog loading errors', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { title: 'foo', date: '2012-10-01' }
        ]));
        network.add('barblog', new Blog([
            { title: 'a' /* missing date */ }
        ]));
        network.load(function (err) {
            if (!err) {
                assert(false, 'No error on network load');
            }
            done();
        });
    });

    it('should select posts aggregated from all blogs', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'foo', date: '2012-10-03' }
          , { title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { title: 'a', date: '2012-10-02' }
          , { title: 'b', date: '2012-10-04' }
          , { title: 'c', date: '2012-10-06' }
        ]));
        network.load(function (err) {
            assert(!err, err);
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
            { title: 'foo', date: '2012-10-01' }
          , { title: 'foo', date: '2012-10-03' }
          , { title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { title: 'a', date: '2012-10-02' }
          , { title: 'b', date: '2012-10-04' }
          , { title: 'c', date: '2012-10-06' }
        ]));
        network.load(function (err) {
            assert(!err, err);
            network.posts(null, 3, 1, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 3);
                assert.equal(selected[0].title, 'bar');
                assert.equal(selected[0].blog, 'fooblog');
                assert.equal(selected[1].title, 'b');
                assert.equal(selected[1].blog, 'barblog');
                assert.equal(selected[2].title, 'foo');
                done();
            });
        });
    });

    it('should select posts using a query', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
          , { title: 'foo', date: '2012-10-03' }
          , { title: 'bar', date: '2012-10-05' }
        ]));
        network.add('barblog', new Blog([
            { title: 'a', date: '2012-10-02' }
          , { title: 'b', date: '2012-10-04', category: 'bar' }
          , { title: 'c', date: '2012-10-06' }
        ]));
        network.load(function (err) {
            assert(!err, err);
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

    it('should select a unique set of keys from each post', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
          , { title: 'foo', date: '2012-10-03', category: 'bar' }
          , { title: 'bar', date: '2012-10-05', category: 'foo' }
        ]));
        network.add('barblog', new Blog([
            { title: 'a', date: '2012-10-02', category: 'foobar' }
          , { title: 'b', date: '2012-10-04', category: 'bar' }
          , { title: 'c', date: '2012-10-06', category: 'foobar' }
        ]));
        network.load(function (err) {
            assert(!err, err);
            assert.deepEqual(network.keys('category'), ['foo', 'bar', 'foobar']);
            //Check the cached response
            assert.deepEqual(network.keys('category'), ['foo', 'bar', 'foobar']);
            done();
        });
    });

    it('should run a user-defined mapper function onload', function (done) {
        var network = new Network();
        network.add('fooblog', new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
        ]));
        network.add('barblog', new Blog([
            { title: 'a', date: '2012-10-02', category: 'foobar' }
        ]));
        network.map(function (post) {
            post.permalink = format('/%s/%s/%s/%s', post.blog, post.year, post.month, post.slug);
            return post;
        });
        network.load(function (err) {
            assert(!err, err);
            network.post('fooblog', 'foo', function (err, post) {
                assert(!err, err);
                assert.equal(post.permalink, '/fooblog/2012/10/foo');
                network.post('barblog', 'a', function (err, post) {
                    assert(!err, err);
                    assert.equal(post.permalink, '/barblog/2012/10/a');
                    done();
                });
            });
        });
    });

});

