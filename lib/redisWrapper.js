const Cacher = require('./caching/cacher');
const LazyCaching = require('./caching/lazyCaching');
const FullyCaching = require('./caching/fullyCaching');
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
   * Lazy caching only loads data into the cache when necessary
   *
   * @param {number} expire Time to live for cache
   * @returns {LazyCaching} Lazy-cached collection
   */
  lazyCaching(expire = NO_EXPIRE) {
    // chech if expire > 0
    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive number');
    }

    const cacher = new Cacher(this.redis, expire);
    return new LazyCaching(this.collection, cacher);
  }

  /**
   * Fully Caching loads all data into the cache,
   * then all operations will operate on cache before implement to database
   * @returns {FullyCaching} Fully cached collection
   */
  fullyCaching() {
    const cacher = new Cacher(this.redis, NO_EXPIRE);
    return new FullyCaching(this.collection, cacher);
  }
}

module.exports = RedisWrapper;
