const LazyCollection = require('./lazy_collection');
const {
  isId
} = require('../ulti/check');

const HASH = 'hash';
const SET = 'set';
const ZSET = 'zset';
const STRING = 'string';

class ThroughCollection extends LazyCollection {
  async find(query, option) {
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

  async loadToCache() {
    const allDocuments = await this.collection.find().toArray();
    for (let doc in allDocuments) {
      // this.redisWrapper.save(doc);
    }
  }

  createIndex(prefix, object, id) {
    id = object._id || id;

    if (!isNaN(object)) {
      const key = `${prefix}:${object}`;
      this.redisWrapper.save(key, id, ZSET);
    }
  }

}


function insertIndexs(redisClient, collectionName, document) {
  const id = `${document._id}`;
  for (let field in document) {
    //ignore _id field
    if (field === '_id') {
      continue;
    }

    const value = document[field];

    // store Date value in milisecond in zset
    if (value.getTime) {
      const key = `${collectionName}.${field}`;
      const time_ms = value.getTime();
      redisClient.zadd(key, time_ms, id);
      continue;
    }

    // store Timestamp in milisecon in zset
    if (value._bsontype === 'Timestamp') {
      const key = `${collectionName}.${field}`;
      const time_ms = value.toNumber();
      redisClient.zadd(key, time_ms, id);
      continue;
    }

    // store numberic values to zset
    if (!isNaN(value)) {
      const key = `${collectionName}.${field}`;
      redisClient.zadd(key, value, id);
      continue;
    }

    // if value of field is object, create field's subObject
    // then insert subObject to index
    if (typeof value === 'object') {
      let subObj = createChild(field, id, value);
      insertIndexs(redisClient, collectionName, subObj);
      continue;
    }

    // store orther type values in set
    const key = `${collectionName}.${field}:${value}`;
    redisClient.sadd(key, id);
  }
}

module.exports = ThroughCollection;