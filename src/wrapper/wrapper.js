// Dependences
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;
const RedisWrapper = require('../redis_wrap');

// Constants
const LAZY_MODE = 'lazy';
const FULL_MODE = 'full';
const DEFAULT_EXPIRE = 120;

class Wrapper {
  constructor(mongo, redis, mode = LAZY_MODE, expire = DEFAULT_EXPIRE) {
    if (!(mongo instanceof MongoClient)) {
      throw new TypeError('mongo must be an instance of MongoClient');
    }

    if (!(redis instanceof RedisClient)) {
      throw new TypeError('redis must be an instance of RedisClient');
    }

    if (mode !== LAZY_MODE && mode !== FULL_MODE) {
      throw new TypeError(`mode must be ${LAZY_MODE} or ${FULL_MODE}`);
    }

    if (expire < 0 || !isNaN(expire)) {
      throw new TypeError('expire time must be a positive number');
    }

    this.mongo = mongo;
    this.redisWrapper = new RedisWrapper(redis);
    this.mode = mode;
    this.expire = expire;
  }

  db(dbName, options) {
    if (!this.mongo.isConnected()) {
      throw new Error('mongo client is not connected');
    }

    const db = this.mongo.db(dbName, options);
    // create new db and return
  }

  cleanCache() {
    this.redisWrapper.cleanCache();
  }
}

module.exports = Wrapper;