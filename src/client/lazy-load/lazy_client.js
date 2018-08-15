const WrapRedis = require('../redis');
const WrapMongo = require('../mongo');

class LazyClient {
  constructor({
    mongo_options = {
      url = URL,
      options = OPTION
    },
    redis_options = {
      expire = NO_EXPIRE,
      options
    }
  }) {
    this.redis = new WrapRedis(redis_options);
    this.mongo = new WrapMongo(this.redis, mongo_options);
    this.expire = expire;
  }

  db(dbName, options) {
    if (!this.mongo.isConnected()) {
      return new Error('mongo client is not connected');
    }

    return this.mongo.db(dbName, options);
  }

  cleanCache() {
    this.redis.flush();
  }
}

module.exports = LazyClient;