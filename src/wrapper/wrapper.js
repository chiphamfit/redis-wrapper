// Dependences
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;
const RedisWrapper = require('../redis_wrapper').RedisWrapper;
const Db = require('./db');

// Constants
const LAZY_MODE = 'lazy';
const FULL_MODE = 'full';
const NO_EXPIRE = -1;

class Wrapper {
  constructor(mongo, redis, expire = NO_EXPIRE) {
    if (!(mongo instanceof MongoClient)) {
      throw new TypeError('mongo must be an instance of MongoClient');
    }

    if (!(redis instanceof RedisClient)) {
      throw new TypeError('redis must be an instance of RedisClient');
    }

    if (isNaN(expire) || expire < 0) {
      throw new TypeError('expire time must be a positive number');
    }

    this.mongoClient = mongo;
    this.redisWrapper = new RedisWrapper(redis, expire);
  }

  db(dbName, options) {
    if (!this.mongoClient.isConnected()) {
      throw new Error('mongo client is not connected');
    }

    const db = this.mongoClient.db(dbName, options);
    return new Db(db, this.redisWrapper);
  }

  async clearCache() {
    await this.redisWrapper.clearCache();
  }
}

module.exports = {
  Wrapper,
  LAZY_MODE,
  FULL_MODE
};