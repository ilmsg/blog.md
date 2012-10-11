var fs = require('fs')
  , path = require('path')
  , util = require('util')
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
};

/**
 * Load blog posts.
 *
 * @param {Function} callback
 */

FileSystemLoader.prototype.load = function (callback) {
    this.walk(this.dir, this.parse.bind(this), callback);
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
        var file = dir + '/' + files.shift();
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
    var ext = path.extname(file).replace(/\./g, '').toLowerCase();
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
    fs.readFile(file, function (err, data) {
        if (err) {
            return callback(err);
        }
        //TODO
        callback();
    });
};

