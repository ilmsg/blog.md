var assert = require('assert')
  , format = require('util').format
  , Blog = require('../').Blog;

describe('Blog', function () {

    it('should parse post dates', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            blog.post('foo', function (err, foo) {
                assert(!err, err);
                assert(foo.date instanceof Date);
                assert.equal(foo.date.getTime(), new Date('2012-10-01').getTime());
                done();
            });
        });
    });

    it('should verify that posts have a valid title', function (done) {
        var blog = new Blog([
            { date: '2012-10-01' }
        ]);
        blog.load(function (err) {
            if (err) {
                return done();
            }
            assert(false, 'No error received from callback');
        });
    });

    it('should verify that posts have a date', function (done) {
        var blog = new Blog([
            { title: 'foo' }
        ]);
        blog.load(function (err) {
            if (err) {
                return done();
            }
            assert(false, 'No error received from callback');
        });
    });

    it('should verify that posts have a valid date', function (done) {
        var blog = new Blog([
            { title: 'foo', date: 'foo' }
        ]);
        blog.load(function (err) {
            if (err) {
                return done();
            }
            assert(false, 'No error received from callback');
        });
    });

    it('should give posts a unique slug', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'foo', date: '2012-10-02' }
          , { title: 'foo', date: '2012-10-03' }
        ]);
        blog.load(function (err) {
            blog.post('foo', function (err, post) {
                assert(!err, err);
                assert.equal(new Date('2012-10-01').getTime(), post.date.getTime());
                assert.equal(post.day, 1);
                assert.equal(post.month, 10);
                assert.equal(post.year, 2012);
                blog.post('foo-2', function (err, post) {
                    assert(!err, err);
                    assert.equal(new Date('2012-10-02').getTime(), post.date.getTime());
                    blog.post('foo-3', function (err, post) {
                        assert(!err, err);
                        assert.equal(new Date('2012-10-03').getTime(), post.date.getTime());
                        done();
                    });
                });
            });
        });
    });

    it('should select posts', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
          , { title: 'foo', date: '2012-10-02' }
          , { title: 'bar', date: '2012-10-03' }
          , { title: 'baz', date: '2012-10-04' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            blog.posts(function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 4);
                assert.equal(selected[0].title, 'baz');
                assert.equal(selected[1].title, 'bar');
                assert.equal(selected[2].title, 'foo');
                assert.equal(selected[3].title, 'foo');
                done();
            });
        });
    });

    it('should select posts while respecting a limit and offset parameter', function (done) {
        var blog = new Blog([
            { title: 'foobar', date: '2012-10-01' }
          , { title: 'foo', date: '2012-10-02' }
          , { title: 'bar', date: '2012-10-03' }
          , { title: 'baz', date: '2012-10-04' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            blog.posts(null, 2, 1, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 2);
                assert.equal(selected[0].title, 'bar');
                assert.equal(selected[1].title, 'foo');
                done();
            });
        });
    });

    it('should select posts while respecting an offset parameter', function (done) {
        var blog = new Blog([
            { title: 'foobar', date: '2012-10-01' }
          , { title: 'foo', date: '2012-10-02' }
          , { title: 'bar', date: '2012-10-03' }
          , { title: 'baz', date: '2012-10-04' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            blog.posts(null, null, 1, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 3);
                assert.equal(selected[0].title, 'bar');
                assert.equal(selected[1].title, 'foo');
                assert.equal(selected[2].title, 'foobar');
                done();
            });
        });
    });

    it('should select posts using a query', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
          , { title: 'foo', date: '2012-10-02', category: 'foo' }
          , { title: 'bar', date: '2012-10-03', category: 'bar' }
          , { title: 'baz', date: '2012-10-04', category: 'baz' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            blog.posts({ category: 'bar' }, function (err, selected) {
                assert(!err, err);
                assert.equal(selected.length, 2);
                assert.equal(selected[0].title, 'bar');
                assert.equal(selected[1].title, 'foo');
                selected.forEach(function (post) {
                    assert.equal(post.category, 'bar');
                });
                done();
            });
        });
    });

    it('should select a unique set of keys from each post', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
          , { title: 'foo', date: '2012-10-02', category: 'foobar' }
          , { title: 'bar', date: '2012-10-03', category: 'bar' }
          , { title: 'baz', date: '2012-10-04', category: 'baz' }
        ]);
        blog.load(function (err) {
            assert(!err, err);
            assert.deepEqual(blog.keys('category'), ['baz', 'bar', 'foobar']);
            //Check the cached response
            assert.deepEqual(blog.keys('category'), ['baz', 'bar', 'foobar']);
            done();
        });
    });

    it('should load from the file system when a string is passed to the constructor', function (done) {
        var blog = new Blog(__dirname + '/data/blog2');
        blog.load(function (err) {
            assert(!err, err);
            blog.post('post1', function (err, post1) {
                assert(!err, err);
                assert.equal(post1.title, 'post1');
                assert(post1.date instanceof Date);
                assert.equal(post1.date.getTime(), new Date('2012-10-01').getTime());
                blog.post('post2', function (err, post2) {
                    assert(!err, err);
                    assert.equal(post2.title, 'post2');
                    assert(post2.date instanceof Date);
                    assert.equal(post2.date.getTime(), new Date('2012-10-02').getTime());
                    done();
                });
            });
        });
    });

    it('should run a user-defined mapper function onload', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
          , { title: 'foo', date: '2012-10-02', category: 'foobar' }
          , { title: 'bar', date: '2012-10-03', category: 'foobar' }
          , { title: 'baz', date: '2012-10-04', category: 'baz' }
        ]);
        blog.map(function (post) {
            post.permalink = format('/blog/%s/%s', blog.slug(post.category), post.slug);
            return post;
        });
        blog.load(function (err) {
            assert(!err, err);
            blog.post('bar', function (err, post) {
                assert(!err, err);
                assert.equal(post.permalink, '/blog/foobar/bar');
                done();
            });
        });
    });

    it('should run a function when data changes', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01', category: 'bar' }
          , { title: 'foo', date: '2012-10-02', category: 'foobar' }
          , { title: 'bar', date: '2012-10-03', category: 'foobar' }
          , { title: 'baz', date: '2012-10-04', category: 'baz' }
        ]);
        blog.onload(function (blog, posts) {
            blog.foo = 'bar';
            posts.forEach(function (post) {
                post.bar = 'foo';
            });
        });
        blog.load(function (err) {
            assert(!err, err);
            assert.equal(blog.metadata.foo, 'bar');
            blog.post('bar', function (err, post) {
                assert(!err, err);
                assert.equal(post.bar, 'foo');
                done();
            });
        });
    });

});

