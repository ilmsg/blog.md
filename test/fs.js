var lib_dir = process.env.JS_COV ? '../lib-cov/': '../lib/';

var assert = require('assert')
  , FileSystemLoader = require(lib_dir + 'loaders/fs').FileSystemLoader;

describe('File System Loader', function () {

    it('should parse metadata blocks', function (done) {
        var block = 'title: foo\n' +
                    'some.nested.obj.foo: a\n' +
                    'some.nested.obj.bar: b\n' +
                    'categories: [ foo, bar, baz ]';
        var meta = FileSystemLoader.prototype.parseMetadata(block);
        assert.deepEqual(meta, {
            title: 'foo'
          , some: { nested: { obj: { foo: 'a', bar: 'b' } } }
          , categories: [ 'foo', 'bar', 'baz' ]
        });
        done();
    });

    it('should fail on an unknown format', function (done) {
        var loader = new FileSystemLoader(__dirname + '/data/blog1');
        loader.on('error', function (err) {
            assert(err);
            done();
        });
    });

    it('should parse markdown files', function (done) {
        var loader = new FileSystemLoader(__dirname + '/data/blog2');
        loader.on('load', function (posts) {
            assert.equal(posts.length, 2);
            assert.equal(posts[0].id, __dirname + '/data/blog2/a/post1.md');
            assert.equal(posts[1].id, __dirname + '/data/blog2/b/post2.md');
            assert.equal('post1', posts[0].title);
            assert.equal('post2', posts[1].title);
            assert.equal('bar', posts[0].foo);
            assert.equal('baz', posts[1].foo);
            var html = '<p>The <em>quick</em> brown fox jumped over the <strong>lazy</strong> dog</p>';
            assert.equal(html, posts[0].body);
            assert.equal(html, posts[1].body);
            done();
        });
    });

    it('should parse html files', function (done) {
        var loader = new FileSystemLoader(__dirname + '/data/blog3');
        loader.on('load', function (posts) {
            assert.equal(posts.length, 2);
            assert.equal(posts[0].id, __dirname + '/data/blog3/a/post1.html');
            assert.equal(posts[1].id, __dirname + '/data/blog3/b/post2.html');
            assert.equal('post1', posts[0].title);
            assert.equal('post2', posts[1].title);
            assert.equal('bar', posts[0].foo);
            assert.equal('baz', posts[1].foo);
            var html = '<p>The <em>quick</em> brown fox jumped over the <strong>lazy</strong> dog</p>';
            assert.equal(html, posts[0].body);
            assert.equal(html, posts[1].body);
            done();
        });
    });

    it('should detect new blog posts and push automatically');

    it('should push changes to blog posts');

    it('should detect when a blog post is removed');

    it('should detect changes to blog metadata');

});

