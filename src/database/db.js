const Db = require('mongodb').Db;
const CollectionWrapper = require('./collection');

class DbWrapper {
  constructor(db, redis) {
    this.db = db;
    this.redis = redis;
  }

  async collection(name, options) {
    let collection = undefined;
    try {
      collection = this.db.collection(name, options);
    } catch (error) {
      throw error;
    }

    return new CollectionWrapper(collection, this.redis);
  }

  async collections() {
    let listCollections = [];

    try {
      listCollections = await getAllCollections(this.name, this.db, this.redisClient);
    } catch (error) {
      throw error;
    }

    return listCollections;
  }

  dropDatabase(options) {
    try {
      this.db.dropDatabase(options);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DbWrapper;