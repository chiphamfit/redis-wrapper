// Dependences
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;
const RedisWrapper = require('./redis_wrapper');
const LazyCollection = require('./collection/lazy_collection');
const ThroughCollection = require('./collection/through_collection');

// Constants
const NO_EXPIRE = -1;
const URL = 'mongodb://localhost:27017/';
const OPTION = {
  useNewUrlParser: true
};

class Wrapper {
  constructor(mongo, redis, expire) {
    // check if user bybass mongo, redis 
    if (typeof mongo === 'number' && !(redis && expire)) {
      expire = mongo;
      mongo = undefined;
    }

    if (typeof redis === 'number' && !expire) {
      expire = redis;

      // check if user bybass mongo
      if (mongo instanceof RedisClient) {
        redis = mongo;
        mongo = undefined;
      }
    }

    if (!(mongo instanceof MongoClient || mongo instanceof Promise)) {
      throw new TypeError('mongo must be a MongoClient');
    }

    // create mongoClient
    this.mongo = mongo || MongoClient.connect(URL, OPTION);
    // create redisWrapper
    this.redisWrapper = new RedisWrapper(redis, expire);
    // set mode
    this.lazy = this.redisWrapper.expire === NO_EXPIRE ? false : true;
  }

  async connect() {
    if (this.mongo instanceof Promise) {
      this.mongo = await this.mongo;
    }

    return this;
  }

  db(dbName, options) {
    if (!this.isConnected()) {
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
    if (!this.mongo) {
      return false;
    }

    this.redisWrapper.on('connect', (error) => {
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