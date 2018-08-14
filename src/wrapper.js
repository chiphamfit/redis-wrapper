// Dependences
const LazyClient = require('./lazy/lazyClient');
const FullClient = require('./full/fullClient');
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;

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

    this.redis = redis;
    this.mongo = mongo;
    this.mode = mode;
    this.expire = expire;
  }

  createClient() {
    if (this.mode === LAZY_MODE) {
      return new LazyClient(this.mongo, this.redis, this.expire);
    }

    return new FullClient(this.mongo, this.redis);
  }
}

module.exports = Wrapper;