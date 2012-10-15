module.exports = {
    Blog: require('./lib/blog').Blog
  , FileSystemLoader: require('./lib/loaders/fs').FileSystemLoader
  , ArrayLoader: require('./lib/loaders/array').ArrayLoader
};

