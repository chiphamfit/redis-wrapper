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
    if (!(mongo instanceof MongoClient)) {
      MongoClient.connect(URL, OPTION, (error, client) => {
        if (error) {
          throw error;
        }

        mongo = client;
      });
    }

    this.mongo = mongo;
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
    if (!this.mongo.isConnected()) {
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