const LazyCollection = require('./lazy_collection');
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
    const db = this.mongoDb;
    options = options || {};

    options = Object.assign({}, options);

    // Set the promise library
    options.promiseLibrary = db.s.promiseLibrary;

    // If we have not set a collection level readConcern set the db level one
    options.readConcern = options.readConcern || db.s.readConcern;

    // Do we have ignoreUndefined set
    if (db.s.options.ignoreUndefined) {
      options.ignoreUndefined = db.s.options.ignoreUndefined;
    }

    // Create initial options for collection
    const initOptions = {
      db: db,
      topology: db.s.topology,
      dbName: this.name,
      name: name,
      pkFactory: db.s.pkFactory,
      options: options,
      redis: this.redisWrapper,
      expire: this.options.expire
    };


    if (this.options.mode === FULL_MODE) {
      return new CollectionFull(initOptions);
    }

    return new LazyCollection(initOptions);
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