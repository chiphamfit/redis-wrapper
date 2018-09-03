const { isCollection, isRedisWrapper } = require('../ulti/helper');

class Cache {
  /**
   *
   * @param {Collection} collection mongodb's collection need to lazy cache
   * @param {RedisWrapper} wrapper wrapper for mongodb
   */
  constructor(collection, wrapper) {
    if (!isCollection(collection)) {
      throw new TypeError('collection must be a Collection');
    }

    if (!isRedisWrapper(wrapper)) {
      throw new TypeError('wrapper must be a instance of RedisWrapper');
    }

    this.collection = collection;
    this.wrapper = wrapper;
    this.namespace = `${collection.s.dbName}.${collection.s.name}`;
    this.expire = wrapper.expire_time;

    // Clone all function from collection class
    for (let key in collection) {
      const func = collection[key];
      if (func instanceof Function) {
        this[key] = func.bind(this.collection);
      }
    }
  }

  close() {
    this.collection.close();
    this.wrapper.exit();
  }
}

module.exports = Cache;
