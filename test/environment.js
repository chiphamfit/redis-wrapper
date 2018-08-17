const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').createClient;
const Wrapper = require('../src/wrapper/wrapper').Wrapper;
const Db = require('../src/wrapper/db');
const CollectionLazy = require('../src/wrapper/collection_lazy');
const CollectionFull = require('../src/wrapper/collection_full');

const MONGO_URL = 'mongodb://localhost:27017/test';

class Enviroment {
  static async init() {
    this.mongo = await MongoClient.connect(MONGO_URL, {
      useNewUrlParser: true
    });

    this.redis = await RedisClient();
  }

  static initCache() {
    for (let i = 1; i < 5; i++) {
      this.redis.set(i, i);
    }
  }

  static lazyClient(expire) {
    return new Wrapper(this.mongo, this.redis, 'lazy', expire);
  }

  static fullClient() {
    return new Wrapper(this.mongo, this.redis, 'full');
  }
}

module.exports = {
  Enviroment,
  Wrapper,
  Db,
  CollectionFull,
  CollectionLazy
};