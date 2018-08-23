const createHash = require('crypto').createHash('md5');
const RedisWrapper = require('../redis_wrapper');

// Constances
const SET = 'set';
const STRING = 'string';

class LazyCollection {
  constructor(collection, redisWrapper) {
    if (!collection.s) {
      throw new TypeError('collection must be a Collection');
    }

    if (!(redisWrapper instanceof RedisWrapper)) {
      throw new TypeError('redisWrapper must be a instance of RedisWrapper');
    }

    this.collection = collection;
    this.redisWrapper = redisWrapper;
    this.dbName = collection.s.dbName;
    this.name = collection.s.name;
    this.namespace = `${this.dbName}.${this.name}`;
    this.hash = createHash.update(this.namespace);
  }

  async clearCache() {
    // search all cache key of this collection and  delete
    const cacheList = await this.redisWrapper.search(this.namespace, SET);
    cacheList.forEach(cache => {
      this.redisWrapper.delete(cache);
    });

    // delete cache list
    this.redisWrapper.delete(this.namespace);
  }

  /**
   * Selects documents in a collection and returns an array to the selected documents
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document array
   */
  async find(query = {}, option = {}) {
    // Check special case where we are using an objectId
    if (query && query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    // create query_id for search/save
    const query_id = this.hash
      .update(JSON.stringify(query))
      .update(JSON.stringify(option))
      .digest('hex');

    // scan in cache fisrt
    let listDocuments = await this.redisWrapper.searchLazyCache(query_id);
    // if cache hit return result
    if (listDocuments.length > 0) {
      return listDocuments;
    }

    // if cache miss, try to find in mongodb
    listDocuments = await this.collection.find(query, option).toArray();

    // Create cache for query
    await this.redisWrapper.saveLazyCache(query_id, listDocuments, this.namespace);

    return listDocuments;
  }

  /**
   * Returns one document that satisfies the specified query criteria.
   * If multiple documents satisfy the query, this method returns the first document 
   * according to the natural order which reflects the order of documents on the disk. 
   * In capped collections, natural order is the same as insertion order. 
   * If no document satisfies the query, the method returns null.
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document or null
   */
  async findOne(query = {}, option = {}) {
    // create key for search/save
    const query_id = this.hash
      .update('findOne')
      .update(JSON.stringify(query))
      .update(JSON.stringify(option))
      .digest('hex');

    // search in cache
    let document = await this.redisWrapper.search(query_id, STRING);
    if (document) {
      return JSON.parse(document);
    }

    // cache miss, search in mongodb
    document = await this.collection.findOne(query, option);

    if (document && document._id) {
      // save query 
      this.redisWrapper.set(query_id, document);
      // update cache list
      this.redisWrapper.save(this.namespace, [query_id], SET);
    }

    return document || null;
  }

  // Copy functions of Collection, convert them to Async

  // Index
  async createIndex(fieldOrSpec, options) {
    return await this.collection.createIndex(fieldOrSpec, options);
  }

  async createIndexs(indexSpecs, options) {
    return await this.collection.createIndexs(indexSpecs, options);
  }
  async dropIndex(indexName, options) {
    return await this.collection.dropIndex(indexName, options);
  }

  async dropIndexs(options) {
    return await this.collection.dropIndexs(options);
  }

  async dropAllIndexes() {
    return await this.collection.dropAllIndexes();
  }

  async indexes(options) {
    return await this.collection.indexes(options);
  }

  async listIndexes(options) {
    return await this.collection.listIndexes(options);
  }

  // Db
  async deleteMany(filter, options) {
    await this.clearCache();
    return await this.collection.deleteMany(filter, options);
  }

  async deleteOne(filter, options) {
    await this.clearCache();
    return await this.collection.deleteOne(filter, options);
  }

  async drop(options) {
    await this.clearCache();
    return await this.collection.drop(options);
  }

  async findOneAndDelete(filter, options) {
    await this.clearCache();
    return this.collection.findOneAndDelete(filter, options);
  }

  async findOneAndReplace(filter, replacement, options) {
    await this.clearCache();
    return this.collection.findOneAndReplace(filter, replacement, options);
  }

  async findOneAndUpdate(filter, update, options) {
    await this.clearCache();
    return this.collection.findOneAndUpdate(filter, update, options);
  }

  async insertMany(docs, options) {
    await this.clearCache();
    return await this.collection.insertMany(docs, options);
  }

  async insertOne(doc, options) {
    await this.clearCache();
    return await this.collection.insertOne(doc, options);
  }

  async replaceOne(filter, doc, options) {
    await this.clearCache();
    return await this.collection.replaceOne(filter, doc, options);
  }

  async updateMany(filter, update, options) {
    await this.clearCache();
    return await this.collection.updateMany(filter, update, options);
  }

  async updateOne(filter, update, options) {
    await this.clearCache();
    return await this.collection.updateOne(filter, update, options);
  }
}

module.exports = LazyCollection;