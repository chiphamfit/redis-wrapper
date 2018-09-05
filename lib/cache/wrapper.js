const {
  promisifyAll,
  isRedisClient,
  isCollection,
  RedisClient
} = require('../ulti/helper');

class Wrapper {
  /**
   * Create a wrapper for mongo's collection and redis
   * @param {*} collection mongo's collection that need to cache
   * @param {*} redis redis client that store cache
   */
  constructor(collection, redis) {
    // check if argument are wrapped
    if (isCollection(redis) && isRedisClient(collection)) {
      const temp = redis;
      redis = collection;
      collection = temp;
    }

    // check invalid collection
    if (!isCollection(collection)) {
      throw new TypeError('collection must be a mongodb\'s Collection');
    }

    // check if redis is bypassed
    if (!redis) {
      redis = new RedisClient();
    }

    if (!isRedisClient(redis)) {
      throw new TypeError('redis must be a RedisClient');
    }

    this.collection = collection;
    this.redis = redis;
    this.namespace = `${collection.s.dbName}.${collection.s.name}`;

    // add Async functions to redis client
    promisifyAll(this.redis);
  }

  close() {
    this.redis.quit();
  }
}

module.exports = Wrapper;
