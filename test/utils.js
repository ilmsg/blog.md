var assert = require('assert')
  , utils = require('../lib/utils');

describe('Utils', function () {

    it('should provide a generic query facility', function () {
        var obj = { foo: 'bar' };
        assert.ok(utils.query(obj, { foo: 'bar' }));
        assert.ok(utils.query(obj, { foo: /bar/ }));
        assert.ok(utils.query(obj, { foo: [ 'bar', 'baz' ] }));
        assert.ok(utils.query(obj, { foo: [ /bar/, /baz/ ] }));
        assert.ok(!utils.query(obj, { foo: [ 'foobar', 'baz' ] }));
        assert.ok(utils.query(obj, { foo: { $not: 'baz' } }));
        assert.ok(utils.query(obj, { foo: { $not: [ 'baz', 'foobar' ] } }));
        assert.ok(!utils.query(obj, { foo: { $not: [ 'baz', 'bar' ] } }));
    });

    it('should support nested obj queries', function () {
        var obj = { foo: 'bar', category: { baz: 'qux' } };
        assert.ok(!utils.query(obj, { category: { baz: 'foo' } }));
        assert.ok(utils.query(obj, { category: { baz: 'qux' } }));
    });

});
