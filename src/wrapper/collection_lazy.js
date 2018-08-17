const crypto = require('crypto');
const CollectionWrapper = require('./collection');

class CollectionLazy extends CollectionWrapper {
  async find(query = {}, option = {}) {
    // unpack collection
    let cursor = [];
    let listDocuments = [];
    let inCache = true;

    // Check special case where we are using an objectId
    if (query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
      // Just find by Id
    }

    // create key for search and save in cache
    const dbName = this.s.dbName;
    const collectionName = this.s.name;
    const _query = JSON.stringify(query);
    const _option = JSON.stringify(option);
    const key = crypto.createHash('md5')
      .update(dbName)
      .update(collectionName)
      .update(_query)
      .update(_option)
      .digest('hex');

    // scan in redis fisrt
    listDocuments = await this.redisWrapper.search(key, 'set');
    // if can't found in cache, find in mongodb
    if (listDocuments.length === 0) {
      inCache = false;
      cursor = await super.find(query, option);
      listDocuments = await cursor.toArray();
    }

    // save result into cache 
    if (!inCache && listDocuments.length > 0) {
      listDocuments = listDocuments.map(document => {
        return JSON.stringify(document);
      });
      
      await this.redisWrapper.save(key, listDocuments, 'set', this.expire);
    }

    return listDocuments;
  }

  async findOne(query, option) {
    if (!(query instanceof Object)) {
      throw new TypeError('query must be an object');
    }

    if (!(option instanceof Object)) {
      throw new TypeError('option must be an object');
    }

    const cursor = await this.find(query, option);
    const result = cursor[0] || null;
    return result;
  }
}

module.exports = CollectionLazy;