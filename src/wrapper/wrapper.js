const {
  LAZY_MODE,
  FULL_MODE,
  isMongoClient,
  isRedisClient
} = require('./operator');

class Wrapper {
  constructor(mongo, redis, mode, expire) {
    if (!isMongoClient(mongo)) {
      throw TypeError('mongoClient must be an instance of MongoClient');
    }

    if (!isRedisClient(redis)) {
      throw TypeError('redisClient must be an instance of RedisClient');
    }

    if (mode === undefined || mode === LAZY_MODE) {
      this.mode = LAZY_MODE;
      this.setExpire(expire);
    } else if (mode === FULL_MODE) {
      this.mode = FULL_MODE;
    } else {
      throw new TypeError('mode must be \'lazy-load\' or \'full-load\'');
    }

    this.redisClient = redisClient;
    this.mongoClient = mongoClient;
  }

  setExpire(expire) {
    if (!(expire instanceof Number)) {
      throw new TypeError('expire time must be a number');
    }

    if (expire !== -1 && expire < 0) {
      throw new TypeError('expire time must be a positive number');
    }

    this.expire = expire;
  }

  connect() {

  }

  close() {

  }

  cleanCache() {

  }
}
const test = new Wrapper();
module.exports = Wrapper;