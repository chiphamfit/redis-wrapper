const CollectionLazy = require('./collection_lazy');
const CollectionFull = require('./collection_full');
const FULL_MODE = require('./wrapper').FULL_MODE;

class Db {
  constructor(mongoDb, redisWrapper, options) {
    this.name = mongoDb.s.databaseName;
    this.mongoDb = mongoDb;
    this.redisWrapper = redisWrapper;
    this.options = options;
  }

  async collection(name, options) {
    if (name == '') {
      throw new TypeError('collection name must be a non-empty string');
    }

    const collection = this.mongoDb.collection(name, options);
    const collectionOptions = [this.mongoDb, await this.mongoDb.s.topology, this.mongoDb.s.databaseName, name, await this.mongoDb.s.pkFactory, options];

    if (this.options.mode === FULL_MODE) {
      return new CollectionFull(collectionOptions, collection, this.redisWrapper);
    }

    return new CollectionLazy(collectionOptions, collection, this.redisWrapper, this.options.expire);
  }

  async collections() {
    let listCollections = [];
    let inCache = true;
    const key = this.name;

    // Try search in cache first
    listCollections = await this.redisWrapper.search(key, 'set');

    if (listCollections.length > 0) {
      // Convert string back to Collection
      listCollections = listCollections.map(collection => {
        return JSON.parse(collection);
      });
      return listCollections;
    }

    // if can't found any data, try searching in mongodb
    if (listCollections.length === 0) {
      listCollections = await this.mongoDb.listCollections().toArray();
      inCache = false;
    }

    // Update cache
    if (!inCache && listCollections.length > 0) {
      const cacheData = listCollections.map(collection => {
        return JSON.stringify(collection);
      });
      await this.redisWrapper.save(key, cacheData, 'set');
    }

    return listCollections;
  }

  dropDatabase() {
    // drop database from mongo
    this.mongoDb.dropDatabase();
    // remove collection cache
    this.redisWrapper.delete(this.name);
    // also drop all relate data in cache
    // { implement here }
  }
}

module.exports = Db;