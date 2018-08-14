const RedisWrapper = require('../database/redis');
const DbWrapper = require('../database/db');

class LazyClient {
  constructor(mongo, redis, expire) {
    this.mongo = mongo;
    this.redis = new RedisWrapper(redis);
    this.expire = expire;
  }

  db(dbName, options) {
    if (!this.mongo.isConnected()) {
      return new Error('mongo client is not connected');
    }
    
    try {
      const db = this.mongo.db(dbName, options);
      return new DbWrapper(db, this.redis);
    } catch (error) {
      throw error;
    }
  }

  cleanCache() {
    this.redis.flush();
  }
}

module.exports = LazyClient;