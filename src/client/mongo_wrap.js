const MongoClient = require('mongodb').MongoClient;
const WrapDb = require('./db');
const WrapRedis = require('./redis');

// Constants
const DEFAULT_URL = 'mongodb://localhost:27017/test';
const OPTION = {
  useNewUrlParser: true
};

class MongoWrap extends MongoClient {
  constructor({
      redis,
      url = DEFAULT_URL,
      options = OPTION
    }) {
    if (!(redis instanceof WrapRedis)) {
      throw new TypeError('redis must be a WrapRedis');
    }

    super(url, options);
    this.redis = redis;
  }

  db(dbName, options) {
    options = options || {};

    // Default to db from connection string if not provided
    if (!dbName) {
      dbName = this.s.options.dbName;
    }

    // Copy the options and add out internal override of the not shared flag
    const finalOptions = Object.assign({}, this.s.options, options);

    // Do we have the db in the cache already
    if (this.s.dbCache[dbName] && finalOptions.returnNonCachedInstance !== true) {
      return this.s.dbCache[dbName];
    }

    // Add promiseLibrary
    finalOptions.promiseLibrary = this.s.promiseLibrary;

    // If no topology throw an error message
    if (!this.topology) {
      throw new MongoError('MongoClient must be connected before calling MongoClient.prototype.db');
    }

    // Return the db object
    const db = new WrapDb(dbName, this.topology, finalOptions, this.redis);

    // Add the db to the cache
    this.s.dbCache[dbName] = db;
    // Return the database
    return db;
  };
}

module.exports = {
  MongoWrap,
  OPTION,
  DEFAULT_URL
};