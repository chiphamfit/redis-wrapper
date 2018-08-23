// Dependences
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;
const RedisWrapper = require('./redis_wrapper');
const LazyCollection = require('./collection/lazy_collection');
const ThroughCollection = require('./collection/through_collection');

// Constants
const NO_EXPIRE = 0;
const URL = 'mongodb://localhost:27017/';
const OPTION = {
  useNewUrlParser: true
};

class Wrapper {
  constructor(mongo, redis, expire) {
    let newMongo = undefined;
    let newRedis = undefined;
    let newExpire = expire || NO_EXPIRE;

    // Overload constructor
    // Swapped clients
    if (mongo instanceof RedisClient && redis instanceof MongoClient) {
      newMongo = redis;
      newRedis = mongo;
    }

    // Missing arguments
    if (expire === NO_EXPIRE) {
      // check if user bybass mongo, redis 
      if (typeof mongo === 'number' && redis === undefined) {
        newExpire = mongo;
      } else if (mongo instanceof RedisClient && typeof redis === 'number') {
        // check if user bybass mongo
        newExpire = redis;
        newRedis = mongo;
      } else if (typeof redis === 'number') {
        // check if user bybass redis
        newExpire = redis;
      }
    }

    newMongo = newMongo || MongoClient.connect(URL, OPTION);

    if (!(newMongo instanceof MongoClient) && !(newMongo instanceof Promise)) {
      throw new TypeError('mongo must be a MongoClient');
    }

    // create mongoClient
    this.mongo = newMongo;
    // create redisWrapper
    this.redisWrapper = new RedisWrapper(newRedis, newExpire);
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
}

module.exports = Wrapper;