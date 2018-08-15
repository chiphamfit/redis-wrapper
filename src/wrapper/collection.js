const {
  find,
  findOne
} = require('./collection/operations');
const {
  isValidString,
  isFunction
} = require('../ulti/check');
const {
  LazyCacheTypeError
} = require('../error/error');

class Collection {
  constructor(collectionName, db) {
    if (!isValidString(collectionName)) {
      throw new LazyCacheTypeError('collection name must be a non-empty string');
    }
    this.dbName = db.name;
    this.db = db.db;
    this.name = collectionName;
    this.dbCollection = db.db.collection(collectionName);
    this.redisClient = db.redisClient;
    this.expire = db.expire;
  }

  async find(query, option, callback) {
    if (callback && !isFunction(callback)) {
      throw new LazyCacheTypeError('callback must be an function');
    }

    let error = null;
    query = query === undefined ? {} : query;
    option = option === undefined ? {} : option;

    if (!(query instanceof Object)) {
      error = new LazyCacheTypeError('query must be an object');
      if (callback) {
        return callback(error);
      }
    }

    if (!(option instanceof Object)) {
      error = new LazyCacheTypeError('option must be an object');
      if (callback) {
        return callback(error);
      }
    }

    const result = await find(this, query, option);

    if (callback) {
      return callback(error, result)
    }

    return result;
  }

  async findOne(query, option, callback) {
    let error = null;

    if (callback && !isFunction(callback)) {
      throw new LazyCacheTypeError('callback must be an function');
    }

    if (!(query instanceof Object)) {
      error = new LazyCacheTypeError('query must be an object');
      if (callback) {
        return callback(error);
      }
    }

    if (!(option instanceof Object)) {
      error = new LazyCacheTypeError('option must be an object');
      if (callback) {
        return callback(error);
      }
    }

    const cursor = await this.find(query, option);
    const result = cursor[0] || null;
    
    if (callback) {
      return callback(error, result)
    }

    return result;
  }

  update() {

  }

  insert() {

  }

  delete() {

  }

  drop() {

  }

}

module.exports = Collection;