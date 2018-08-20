const createHash = require('crypto').createHash;
const isId = require('../ulti/check').isId;

class LazyCollection {
  constructor(collection, redisWrapper) {
    this.dbName = collection.s.dbName;
    this.name = collection.s.name;
    this.collection = collection;
    this.redisWrapper = redisWrapper;
  }

  async createIndex(fieldOrSpec, options) {
    return await this.collection(fieldOrSpec, options);
  }

  async createIndexs(indexSpecs, options) {
    return await this.collection.createIndexs(indexSpecs, options);
  }

  async deleteMany(filter, options) {
    // find all doc with filter and delete them
    // here
    return await this.collection.deleteMany(filter, options);
  }

  async deleteOne(filter, options) {
    // find one doc with filter and delete them
    // here
    return await this.collection.deleteOne(filter, options);
  }

  async drop(options) {
    // drop all cached data
    await this.redisWrapper.clearCache();
    return await this.collection.drop(options);
  }

  async dropAllIndexes() {
    return await this.collection.dropAllIndexes();
  }

  async dropIndex(indexName, options) {
    return await this.collection.dropIndex(indexName, options);
  }

  async dropIndexs(options) {
    return await this.collection.dropIndexs(options);
  }

  async find(query = {}, option = {}) {
    // Check special case where we are using an objectId
    if (isId(query)) {
      query = {
        _id: query
      };
    }

    // create key for search/save
    const _query = JSON.stringify(query);
    const _option = JSON.stringify(option);
    const key = createHash('md5')
      .update(this.dbName)
      .update(this.name)
      .update(_query)
      .update(_option)
      .digest('hex');

    // scan in redis fisrt
    const cacheData = await this.redisWrapper.search(key, 'set');
    // if found, parse result back to JSON
    if (cacheData.length > 0) {
      const result = cacheData.map(raw => {
        return JSON.parse(raw);
      });

      return result;
    }

    // if can't found in cache, try to find in mongodb
    const cursor = await this.collection.find(query, option);
    const listDocuments = await cursor.toArray();
    // save result into cache 
    if (listDocuments && listDocuments.length > 0) {
      const cacheData = listDocuments.map(doc => {
        return JSON.stringify(doc);
      });

      await this.redisWrapper.save(key, cacheData, 'set', this.expire);
    }

    return listDocuments;
  }

  async findOne(query = {}, option = {}) {
    // create key for search/save
    const _query = JSON.stringify(query);
    const _option = JSON.stringify(option);
    const key = createHash('md5')
      .update('findOne')
      .update(this.dbName)
      .update(this.name)
      .update(_query)
      .update(_option)
      .digest('hex');

    // search in cache
    let document = await this.redisWrapper.search(key, 'string');
    if (document) {
      return JSON.parse(document);
    }

    // search in mongodb
    document = await this.collection.findOne(query, option);
    if (document && document._id) {
      this.redisWrapper.save(key, document, 'string');
    }

    return document || null;
  }

  async findOneAndDelete(filter, options) {
    return this.collection.findOneAndDelete(filter, options);
  }

  async findOneAndReplace(filter, replacement, options) {
    return this.collection.findOneAndReplace(filter, replacement, options);
  }

  async findOneAndUpdate(filter, update, options) {
    return this.collection.findOneAndUpdate(filter, update, options);
  }

  async indexes(options) {
    return await this.collection.indexes(options);
  }

  async insertMany(docs, options) {
    return await this.collection.insertMany(docs, options);
  }

  async insertOne(doc, options) {
    return await this.collection.insertOne(doc, options);
  }

  async listIndexes(options) {
    return await this.collection.listIndexes(options);
  }

  async replaceOne(filter, doc, options) {
    return await this.collection.replaceOne(filter, doc, options);
  }

  async updateMany(filter, update, options) {
    return await this.collection.updateMany(filter, update, options);
  }

  async updateOne(filter, update, options) {
    return await this.collection.updateOne(filter, update, options);
  }
}

module.exports = LazyCollection;