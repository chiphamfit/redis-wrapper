// Dependences
const MongoClient = require('mongodb').MongoClient;
const RedisWrapper = require('./redis_wrapper').RedisWrapper;
const LazyCollection = require('./collection/lazy_collection');
const ThroughCollection = require('./collection/through_collection');

// Constants
const NO_EXPIRE = -1;
const URL = 'mongodb://localhost:27017/test';
const OPTION = {
  useNewUrlParser: true
};

class Wrapper {
  constructor(mongo, redis, expire = NO_EXPIRE) {
    this.mongo = mongo instanceof MongoClient ? mongo : MongoClient.connect(URL, OPTION);
    if (!(this.mongo instanceof Promise || this.mongo instanceof MongoClient)) {
      throw new TypeError('must be a MongoClient or a Promise of it');
    }

    this.redisWrapper = new RedisWrapper(redis, expire);
    this.lazy = this.redisWrapper.expire === NO_EXPIRE ? false : true;
  }

  async connect() {
    if (this.mongo instanceof Promise) {
      this.mongo = await this.mongo;
    }

    return this;
  }

  db(dbName, options) {
    if (!this.mongo || !this.mongo.isConnected()) {
      throw new Error('Mongo Client must connect before create db');
    }

    // create db, override db.collection() method
    let db = this.mongo.db(dbName, options);
    db.lazy = this.lazy;
    db.redisWrapper = this.redisWrapper;
    db.cacheCollection = function(name, options) {
      const collection = this.collection(name, options);
      if (this.lazy) {
        return new LazyCollection(collection, this.redisWrapper);
      }

      return new ThroughCollection(collection, this.redisWrapper);
    };

    return db;
  }

  isConnected() {
    if (!this.mongo.isConnected) {
      return false;
    }

    this.redis.on('connect', (error) => {
      if (error) {
        return false;
      }
    });

    return this.mongo.isConnected();
  }

  async clearCache() {
    await this.redisWrapper.clearCache();
  }
}

module.exports = Wrapper;