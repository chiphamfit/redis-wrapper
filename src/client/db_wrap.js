const Db = require('mongodb').Db;
const Collection = require('./collection');

class DbWrap extends Db {
  constructor(dbName, topology, finalOptions, redis) {
    super(dbName, topology, finalOptions);
    this.redis = redis;
  }

  async collection(name, options) {
    let collection = undefined;
    try {
      collection = this.db.collection(name, options);
    } catch (error) {
      throw error;
    }

    return new CollectionWrap(collection, this.redis);
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

module.exports = DbWrap;