const Cacher = require('./cache/cacher');
const LazyCaching = require('./cache/lazyCaching');
const ThroughCollection = require('./cache/caching');
const { NO_EXPIRE } = require('./ulti/constant');
const { isCollection, isRedisClient, RedisClient } = require('./ulti/helper');

class RedisWrapper {
  /**
   * Create a wrapper for collection, use redis to caching data of its
   * @param {Collection} collection mongodb collection that need caching
   * @param {RedisClient} redis redis client for caching collection
   */
  constructor(collection, redis) {
    // Overload constructor
    // check if argument are wrapped
    if (isCollection(redis) && isRedisClient(collection)) {
      const temp = redis;
      redis = collection;
      collection = temp;
    }

    // check invalid collection
    if (!isCollection(collection)) {
      throw new TypeError('collection must be a mongodb\' Collection');
    }

    // check if redis is bypassed
    if (redis && !isRedisClient(redis)) {
      throw new TypeError('redis must be a RedisClient');
    }

    this.collection = collection;
    this.redis = redis || new RedisClient();
  }

  /**
   * create client collection that behave alike nomarl collection
   * but use lazy caching for quering data
   * @param {number} expire Time to live for cache (for lazy mode only), bypass for no expire (not recommend)
   */
  lazyCaching(expire = NO_EXPIRE) {
    // chech if expire is >0 number
    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive number');
    }

    const cacher = new Cacher(this.redis, expire);
    return new LazyCaching(this.collection, cacher);
  }

  caching() {
    const cacher = Cacher(this.redis, NO_EXPIRE);
    return new ThroughCollection(this.collection, cacher);
  }
}

module.exports = RedisWrapper;
