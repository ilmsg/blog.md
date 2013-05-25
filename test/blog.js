var lib_dir = process.env.JS_COV ? '../lib-cov/': '../lib/';

var assert = require('assert')
  , Blog = require(lib_dir + 'blog').Blog
  , ArrayLoader = require(lib_dir + 'loaders/array').ArrayLoader;

describe('Blog', function () {

    it('should parse post dates', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
        ]);
        blog.on('load', function () {
            var post = blog.post('foo');
            assert(post.date instanceof Date);
            assert.equal(post.date.getTime(), new Date('2012-10-01').getTime());
            done();
        });
    });

    it('should verify that posts have a valid title', function (done) {
        var blog = new Blog([
            { id: 1, date: '2012-10-01' }
        ]);
        blog.on('error', function () {
            done();
        });
    });

    it('should verify that posts have an id', function (done) {
        var blog = new Blog([
            { title: 'foo', date: '2012-10-01' }
        ]);
        blog.on('error', function () {
            done();
        });
    });

    it('should verify that post ids are unique', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
          , { id: 1, title: 'foo', date: '2012-10-01' }
        ]);
        blog.on('error', function () {
            done();
        });
    });

    it('should verify that posts have a date', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo' }
        ]);
        blog.on('error', function () {
            done();
        });
    });

    it('should verify that posts have a valid date', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: 'foo' }
        ]);
        blog.on('error', function () {
            done();
        });
    });

    it('should give posts a unique slug', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-02' }
          , { id: 3, title: 'foo', date: '2012-10-03' }
        ]);
        blog.on('load', function () {
            var post = blog.post('foo');
            assert.equal(new Date('2012-10-01').getTime(), post.date.getTime());
            post = blog.post('foo-2');
            assert.equal(new Date('2012-10-02').getTime(), post.date.getTime());
            post = blog.post('foo-3');
            assert.equal(new Date('2012-10-03').getTime(), post.date.getTime());
            var posts = blog.select();
            assert(posts[0].date > posts[1].date && posts[1].date > posts[2].date);
            done();
        });
    });

    it('should skip slug generation if slugs already exist', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-01', slug: 'foo-1' }
          , { id: 2, title: 'foo', date: '2012-10-02', slug: 'foo-2' }
          , { id: 3, title: 'foo', date: '2012-10-03', slug: 'foo-3' }
        ]);
        blog.on('load', function () {
            var post = blog.post('foo-1');
            assert.equal(new Date('2012-10-01').getTime(), post.date.getTime());
            post = blog.post('foo-2');
            assert.equal(new Date('2012-10-02').getTime(), post.date.getTime());
            post = blog.post('foo-3');
            assert.equal(new Date('2012-10-03').getTime(), post.date.getTime());
            var posts = blog.select();
            assert(posts[0].date > posts[1].date && posts[1].date > posts[2].date);
            done();
        });
    });

    it('should sort posts when no slugs need to be generated', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-03', slug: 'foo-1' }
          , { id: 2, title: 'foo', date: '2012-10-01', slug: 'foo-2' }
          , { id: 3, title: 'foo', date: '2012-10-02', slug: 'foo-3' }
        ]);
        blog.on('load', function () {
            var post = blog.post('foo-1');
            assert.equal(new Date('2012-10-03').getTime(), post.date.getTime());
            post = blog.post('foo-2');
            assert.equal(new Date('2012-10-01').getTime(), post.date.getTime());
            post = blog.post('foo-3');
            assert.equal(new Date('2012-10-02').getTime(), post.date.getTime());
            var posts = blog.select();
            assert(posts[0].date > posts[1].date && posts[1].date > posts[2].date);
            done();
        });
    });

    it('should sort the posts when slugs need to be generated', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-03' }
          , { id: 2, title: 'foo', date: '2012-10-01' }
          , { id: 3, title: 'foo', date: '2012-10-02' }
        ]);
        blog.on('load', function () {
            var post = blog.post('foo-3');
            assert.equal(new Date('2012-10-03').getTime(), post.date.getTime());
            post = blog.post('foo-2');
            assert.equal(new Date('2012-10-02').getTime(), post.date.getTime());
            post = blog.post('foo');
            assert.equal(new Date('2012-10-01').getTime(), post.date.getTime());
            var posts = blog.select();
            assert(posts[0].date > posts[1].date && posts[1].date > posts[2].date);
            done();
        });
    });

    it('should select posts', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-02' }
          , { id: 3, title: 'bar', date: '2012-10-03' }
          , { id: 4, title: 'baz', date: '2012-10-04' }
        ]);
        blog.on('load', function () {
            var posts = blog.select();
            assert.equal(posts.length, 4);
            assert.equal(posts[0].title, 'baz');
            assert.equal(posts[1].title, 'bar');
            assert.equal(posts[2].title, 'foo');
            assert.equal(posts[3].title, 'foo');
            done();
        });
    });

    it('should select posts while respecting a limit and offset parameter', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foobar', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-02' }
          , { id: 3, title: 'bar', date: '2012-10-03' }
          , { id: 4, title: 'baz', date: '2012-10-04' }
        ]);
        blog.on('load', function () {
            var posts = blog.select({ limit: 2, offset: 1 });
            assert.equal(posts.length, 2);
            assert.equal(posts[0].title, 'bar');
            assert.equal(posts[1].title, 'foo');
            done();
        });
    });

    it('should select posts while respecting a limit and page parameter', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foobar', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-02' }
          , { id: 3, title: 'bar', date: '2012-10-03' }
          , { id: 4, title: 'baz', date: '2012-10-04' }
        ]);
        blog.on('load', function () {
            var posts = blog.select({ limit: 2, page: 2 });
            assert.equal(posts.length, 2);
            assert.equal(posts[0].title, 'foo');
            assert.equal(posts[1].title, 'foobar');
            done();
        });
    });

    it('should provide a way to get the number of matched posts', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-02' }
          , { id: 2, title: 'foo', date: '2012-10-03' }
          , { id: 3, title: 'baz', date: '2012-10-04' }
        ]);
        blog.on('load', function () {
            assert.equal(blog.count(), 3);
            assert.equal(blog.count({ query: { title: 'foo' } }), 2);
            done();
        });
    });

    it('should select posts while respecting an offset parameter', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foobar', date: '2012-10-01' }
          , { id: 2, title: 'foo', date: '2012-10-02' }
          , { id: 3, title: 'bar', date: '2012-10-03' }
          , { id: 4, title: 'baz', date: '2012-10-04' }
        ]);
        blog.on('load', function () {
            var posts = blog.select({ offset: 1 });
            assert.equal(posts.length, 3);
            assert.equal(posts[0].title, 'bar');
            assert.equal(posts[1].title, 'foo');
            assert.equal(posts[2].title, 'foobar');
            done();
        });
    });

    it('should select posts using a query', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo', date: '2012-10-01', category: 'bar' }
          , { id: 2, title: 'foo', date: '2012-10-02', category: 'foo' }
          , { id: 3, title: 'bar', date: '2012-10-03', category: 'bar' }
          , { id: 4, title: 'baz', date: '2012-10-04', category: 'baz' }
        ]);
        blog.on('load', function () {
            var posts = blog.select({ query: { category: 'bar' }});
            assert.equal(posts.length, 2);
            assert.equal(posts[0].title, 'bar');
            assert.equal(posts[1].title, 'foo');
            posts.forEach(function (post) {
                assert.equal(post.category, 'bar');
            });
            done();
        });
    });

    it('should load from the file system when a string is passed to the constructor', function (done) {
        var blog = new Blog(__dirname + '/data/blog2');
        blog.on('load', function () {
            var post1 = blog.post('post1');
            assert.equal(post1.title, 'post1');
            assert(post1.date instanceof Date);
            assert.equal(post1.date.getTime(), new Date('2012-10-01').getTime());
            var post2 = blog.post('post2');
            assert.equal(post2.title, 'post2');
            assert(post2.date instanceof Date);
            assert.equal(post2.date.getTime(), new Date('2012-10-02').getTime());
            done();
        });
    });

    it('should maintain an internal linked list to get prev/next posts', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo1', date: '2012-10-01', category: 'bar' }
          , { id: 2, title: 'foo2', date: '2012-10-02', category: 'foobar' }
          , { id: 3, title: 'bar1', date: '2012-10-03', category: 'foobar' }
          , { id: 4, title: 'bar2', date: '2012-10-04', category: 'baz' }
        ]);
        blog.on('load', function () {
            var posts = blog.select();
            assert.equal(posts[0].title, 'bar2');
            assert.equal(posts[0].prev, null);
            assert.equal(posts[0].next.title, 'bar1');
            assert.equal(posts[1].title, 'bar1');
            assert.equal(posts[1].prev.title, 'bar2');
            assert.equal(posts[1].next.title, 'foo2');
            assert.equal(posts[2].title, 'foo2');
            assert.equal(posts[2].prev.title, 'bar1');
            assert.equal(posts[2].next.title, 'foo1');
            assert.equal(posts[3].title, 'foo1');
            assert.equal(posts[3].prev.title, 'foo2');
            assert.equal(posts[3].next, null);
            done();
        });
    });

    it('should support random selection of posts', function (done) {
        var blog = new Blog([
            { id: 1, title: 'foo1', date: '2012-10-01', category: 'bar', tag: 'foo' }
          , { id: 2, title: 'foo2', date: '2012-09-01', category: 'bar', tag: 'bar' }
          , { id: 3, title: 'foo3', date: '2012-08-01', category: 'foo', tag: 'bar' }
        ]);
        blog.on('load', function () {
            var posts = blog.select({ query: { category: 'bar' }, limit: 1, random: true });
            assert(Array.isArray(posts));
            assert.equal(posts.length, 1);
            assert(posts[0].title === 'foo1' || posts[0].title === 'foo2');
            posts = blog.select({ query: { category: 'bar' }, random: true });
            assert(Array.isArray(posts));
            assert.equal(posts.length, 2);
            done();
        });
    });

    it('should use post.match() if available', function (done) {
        function match(category) {
            return this.category === category;
        }
        var blog = new Blog([
            { id: 1, title: 'foo1', date: '2012-10-01', category: 'bar', match: match }
          , { id: 2, title: 'foo2', date: '2012-09-01', category: 'bar', match: match }
          , { id: 3, title: 'foo3', date: '2012-08-01', category: 'foo', match: match }
        ]);
        blog.on('load', function () {
            var posts = blog.select({ query: 'bar' });
            assert(Array.isArray(posts));
            assert.equal(posts[0].title, 'foo1');
            assert.equal(posts[1].title, 'foo2');
            assert.equal(blog.count({ query: 'bar' }), 2);
            done();
        });
    });

    it('should propagate errors emitted by the loader', function (done) {
        var loader = new ArrayLoader([])
          , blog = new Blog(loader);
        blog.on('error', function () {
            done();
        });
        loader.emit('error', new Error());
    });

});

