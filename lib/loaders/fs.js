var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , utils = require('../utils')
  , parser = {};

/**
 * Create a new file system loader.
 *
 * @param {String} dir - the folder containing blog posts
 * @param {Object} options (optional)
 */

var FileSystemLoader = exports.FileSystemLoader = function (dir, options) {
    this.dir = dir.replace(/\/$/, '');
    this.options = options || {};
    this.posts = {};
    this.push = function () {};
    this.remove = function () {};
    this.metadata = this.options.metadata || {};
};

/**
 * Load blog metadata from this file if it exists in the blog dir.
 */

exports.FileSystemLoader.metadata_file = '_metadata';

/**
 * Files or folders to ignore.
 */

exports.FileSystemLoader.ignore = [ '.git', 'README.md' ];

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

FileSystemLoader.prototype.load = function (callback) {
    var self = this;
    this.posts = {};
    this.ignore = utils.createSet(exports.FileSystemLoader.ignore);
    this.walk(this.dir, this.parse.bind(this), function (err) {
        if (err) {
            return callback(err);
        }
        try {
            self.push(self.posts, self.metadata, true);
        } catch (e) {
            return callback(e);
        }
        callback();
    });
};

/**
 * Walk a directory.
 *
 * @param {String} dir
 * @param {Function} on_file - receives (file_path, next) for each file
 * @param {Function} callback (optional)
 */

FileSystemLoader.prototype.walk = function (dir, on_file, callback) {
    var complete = false, self = this;
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
        fs.stat(file, function (err2, stat) {
            if (err2) {
                return callback(err2);
            }
            if (stat.isFile()) {
                on_file(file, function (err3) {
                    if (err3) {
                        return callback(err3);
                    }
                    next(null, files);
                });
            } else {
                self.walk(file, on_file, function (err3) {
                    if (err3) {
                        return callback(err3);
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
    var ext = path.extname(file).replace(/\./g, '').toLowerCase()
      , self = this;
    if (path.basename(file) === exports.FileSystemLoader.metadata_file) {
        return fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
                return callback('Failed to load metadata file, ' + file);
            }
            self.metadata = self.parseMetadata(data);
            callback();
        });
    }
    if (!ext) {
        return callback('No extension');
    }
    if (!(ext in parser)) {
        try {
            parser[ext] = require('../parsers/' + ext);
        } catch (e) {
            return callback('No parser available for .' + ext);
        }
    }
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            return callback(err);
        }
        data = data.split(/\r?\n\r?\n/);
        var metadata = {}, body;
        if (data.length >= 2) {
            body = data.slice(1).join('\n\n');
            metadata = self.parseMetadata(data[0]);
        } else {
            body = data[0];
        }
        parser[ext](body.trim(), function (err, parsed) {
            if (err) {
                return callback(err);
            }
            self.posts[file] = metadata;
            self.posts[file].id = file;
            self.posts[file].body = parsed.trim();
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
                if (value.length && value[0] === '[' && value[value.length-1] === ']') {
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

