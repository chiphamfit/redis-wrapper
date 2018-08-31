const { hashCode, isCollection } = require('../ulti/helper');
const Cacher = require('./cacher').default;

class LazyCaching {
  /**
   * Creat a collection that can cache all query result in a period
   * @param {Collection} collection mongodb's collection need to lazy cache
   * @param {Cacher} cacher cacher for mongodb
   */
  constructor(collection, cacher) {
    if (!isCollection(collection)) {
      throw new TypeError('collection must be a Collection');
    }

    if (!(cacher instanceof Cacher)) {
      throw new TypeError('cacher must be a instance of Cacher');
    }

    this.collection = collection;
    this.name = collection.s.name;
    this.namespace = `${collection.s.dbName}.${this.name}`;
    this.cacher = cacher;
    this.cacheListKey = `lazycache.${this.namespace}`;

    // Clone function from collection
    for (let key in collection) {
      const func = collection[key];

      if (func instanceof Function) {
        this[key] = func.bind(this.collection);
      }
    }
  }

  async cleanCache() {
    // search all cache key of this collection and  delete
    const cacheList = await this.cacher.smembersAsync(this.cacheListKey);
    cacheList.forEach(cache => {
      this.cacher.delete(cache);
    });

    // delete cache list
    this.cacher.delete(this.cacheListKey);
  }

  /**
   * Selects documents in a collection and returns an array to the selected documents
   *
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document array
   */
  async find(query = {}, option = {}) {
    // create query_id for search/save
    const query_id = this.namespace + hashCode(query) + hashCode(option);
    // scan in cache fisrt
    let listDocuments = await this.cacher.getAsync(query_id);

    // if cache hit return result
    if (listDocuments.length > 0) {
      return listDocuments;
    }

    // if cache miss, try to find in mongodb
    listDocuments = await this.collection.find(query, option).toArray();

    // if have result save cache
    if (listDocuments.length > 0) {
      // Create cache for query
      this.cacher.set(query_id, JSON.stringify(listDocuments));
      // Save query_id to cache list
      this.cacher.sadd(this.cacheListKey, query_id);
    }

    return listDocuments;
  }

  /**
   * Returns one document that satisfies the specified query criteria.
   * If multiple documents satisfy the query, this method returns the first document
   * according to the natural order which reflects the order of documents on the disk.
   * In capped collections, natural order is the same as insertion order.
   * If no document satisfies the query, the method returns null.
   *
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document or null
   */
  async findOne(query = {}, option = {}) {
    // create query_id for search/save
    const query_id =
      this.namespace + '.findOne.' + hashCode(query) + hashCode(option);

    // search in cache
    let document = await this.cacher.getAsync(query_id);

    // if cache hit return result
    if (document) {
      return JSON.parse(document);
    }

    // cache miss, search in mongodb
    document = await this.collection.findOne(query, option);

    // if have result save cache
    if (document) {
      // save query
      this.cacher.set(query_id, document);
      // update cache list
      this.cacher.sadd(this.cacheListKey, [query_id]);
    }

    return document || null;
  }
}

module.exports = LazyCaching;
