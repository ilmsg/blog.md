var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , fs = require('fs')
  , path = require('path');

/**
 * Files or folders to ignore.
 */

FileSystemLoader.ignore = [
    '.git', 'README.md', '.DS_Store'
];

/**
 * Create a new file system loader.
 *
 * @param {String} dir - the folder containing blog posts
 * @param {Object} options (optional)
 */

function FileSystemLoader(dir, options) {
    this.dir = dir.replace(/\/$/, '');
    this.options = options || (options = {});
    this.posts = [];
    this.ignore = {};
    var self = this;
    Object.keys(options.ignore || FileSystemLoader.ignore).forEach(function (file) {
        self.ignore[file] = true;
    });
    process.nextTick(function () {
        self.walk(self.dir, function (file, callback) {
            self.parse(file, callback);
        }, function (err) {
            if (err) {
                return self.emit('error', err);
            }
            self.emit('load', self.posts);
        });
    });
}

inherits(FileSystemLoader, EventEmitter);

exports.FileSystemLoader = FileSystemLoader;

/**
 * Walk a directory.
 *
 * @param {String} dir
 * @param {Function} on_file - receives (file_path, next) for each file
 * @param {Function} callback (optional)
 */

FileSystemLoader.prototype.walk = function (dir, on_file, callback) {
    var self = this;
    dir = dir.replace(/\/$/, '');
    fs.readdir(dir, function next(err, files) {
        if (err) {
            return callback(err);
        } else if (!files.length) {
            return callback();
        }
        var filename = files.shift()
          , file = dir + '/' + filename;
        if (filename in self.ignore) {
            return next(null, files);
        }
        fs.stat(file, function (err, stat) {
            if (err) {
                return callback(err);
            }
            if (stat.isFile()) {
                on_file(file, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    next(null, files);
                });
            } else {
                self.walk(file, on_file, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    next(null, files);
                });
            }
        });
    });
};

/**
 * Parse a blog post.
 *
 * @param {String} file
 * @param {Function} callback
 */

FileSystemLoader.prototype.parse = function (file, callback) {
    var ext = path.extname(file).replace(/\./g, '').toLowerCase();
    if (!ext) {
        return callback(new Error('No extension'));
    }
    var parser;
    try {
        parser = require('../parsers/' + ext);
    } catch (e) {
        return callback(new Error('No parser available for .' + ext));
    }
    var self = this;
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            return callback(err);
        }
        data = data.split(/\r?\n\r?\n/);
        var post = {}, body;
        if (data.length >= 2) {
            post = self.parseMetadata(data[0]);
            body = data.slice(1).join('\n\n');
        } else {
            body = data[0];
        }
        parser(body.trim(), function (err, parsed) {
            if (err) {
                return callback(err);
            }
            post.id = file;
            post.body = parsed.trim();
            self.posts.push(post);
            callback();
        });
    });
};

/**
 * Parse a metadata block:
 *
 * @param {String} block
 * @return {Object} metadata
 */

FileSystemLoader.prototype.parseMetadata = function (block) {
    return block.trim().split(/\r?\n/).map(function (row) {
        var kv = row.split(':', 2).map(function (str) {
            return str.trim();
        });
        return kv.length === 2 ? kv : null;
    }).filter(function (row) {
        return !!row;
    }).reduce(function (metadata, row) {
        var scope = metadata;
        row[0].toLowerCase().split('.').forEach(function (key, pos, keys) {
            if (pos === keys.length - 1) {
                var value = row[1];
                if (value.length && value[0] === '[' && value[value.length - 1] === ']') {
                    value = value.slice(1, value.length - 1).split(',').map(function (str) {
                        return str.trim();
                    });
                }
                scope[key] = value;
            } else if (!(key in scope)) {
                scope[key] = {};
            }
            scope = scope[key];
        });
        return metadata;
    }, {});
};

