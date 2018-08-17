const createHash = require('crypto').createHash;
const CollectionWrapper = require('./collection');

class LazyCollection extends CollectionWrapper {
  async find(query = {}, option = {}) {
    // Check special case where we are using an objectId
    if (query && query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    // create key for search/save
    const dbName = this.s.dbName;
    const collectionName = this.s.name;
    const _query = JSON.stringify(query);
    const _option = JSON.stringify(option);
    const key = createHash('md5')
      .update(dbName)
      .update(collectionName)
      .update(_query)
      .update(_option)
      .digest('hex');

    // scan in redis fisrt
    const count = option.limit || -1;
    const cacheData = await this.redisWrapper.search(key, 'set', count);
    // if found, parse result back to JSON
    if (cacheData.length > 0) {
      const result = cacheData.map(raw => {
        return JSON.parse(raw);
      });

      return result;
    }

    // if can't found in cache, try to find in mongodb
    const cursor = await super.find(query, option);
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
    // Config option
    if (option && option.constructor === Object) {
      option.limit = 1;
    } else {
      option = {
        limit: 1
      };
    }

    const cursor = await this.find(query, option);
    const result = cursor[0] || null;
    return result;
  }
}

module.exports = LazyCollection;