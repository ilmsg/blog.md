**blog.md**

## Usage

```bash
$ npm install blog.md
```

Create a directory and fill it with your markdown posts. You're free to organise the directory however you see fit.

Here's an example post

```
title: My Awesome Post
date: 2013-05-25
category: Foobar

This is the post body. It's written in [markdown](http://daringfireball.net/projects/markdown/), **cool**.
```

A few things to note

- Post attributes take the form `key: value`.
- The post body starts exactly two newlines after the attributes.
- The *title* and *date* attributes are required.
- A unique slug is automatically generated from the *title* attribute, unless specified.

```javascript
var Blog = require('blog.md').Blog;

var blog = new Blog(__dirname + '/blog');
blog.on('load', function () {
    //...
});
```

That's it. The library automatically detects updates to your posts (using `fs.watch`).

## API

**blog.post(slug)** - Select a post by its unique slug

```javascript
var post = blog.post('my-awesome-post');
```

**blog.select(options)** - Select multiple posts. The options object can contain a mongodb-style *query* and a *limit* and/or *offset* for pagination. Posts are always sorted by date descending unless the *random* flag is specified.

```javascript
var posts = blog.select({ query: { category: 'Foobar' }, limit: 10 });
```

## Tests

```bash
$ make check
```

Test verbosity can be increased by using `V=1`, e.g. `V=1 make check`

Code coverage analysis (requires a custom [jscoverage][8]) can be run with

```bash
$ make coverage
```

## License (MIT)

Copyright (c) 2012 Sydney Stockholm <opensource@sydneystockholm.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

