const Collection = require('./collection');

class Db {
  constructor(mongoDb, redisWrapper) {
    if (mongoDb) {

    }
    this.db = mongoDb;
    this.redisWrapper = redisWrapper;
  }

  dropDatabase() {

  }

  collection(name) {
    if (!(name instanceof String) || name.length === 0) {
      throw new TypeError('collection name must be a non-empty string');
    }

    return new Collection(name, this);
  }

  async collections() {
    let listCollections = [];
    let inCache = true;
    const key = db.dbName;

    // try search in cache
    listCollections = await this.redisWrapper.search(key, 'set');

    if (listCollections.length > 0) {
      return listCollections;
    }

    // if can't found any data, try searching in mongodb
    if (listCollections.length === 0) {
      listCollections = await this.db.listCollections().toArray();
      inCache = false;
    }

    // Update cache
    if (listCollections.length > 0) {
      if (!inCache) {
        const cacheData = listCollections.map(collection => {
          return JSON.stringify(collection);
        });
        await save(key, cacheData, 'set');
      }
    }

    return listCollections;
  }
}

module.exports = Db;