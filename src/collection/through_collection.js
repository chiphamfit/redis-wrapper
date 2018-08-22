const LazyCollection = require('./lazy_collection');

// const HASH = 'hash';
// const SET = 'set';
// const ZSET = 'zset';
const STRING = 'string';

class ThroughCollection extends LazyCollection {
  async executeQuery(query) {
    return query;
  }

  async find(query, option) {
    // Check special case where we are using an objectId
    if (query && query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    // scan in redis fisrt
    let result = [];
    result = await this.executeQuery(query);

    // if can't found in cache, try to find in lazy-cache mode
    result = await super.find(query, option);
    // update (?)
    return result;
  }

  async findOne(query, option) {
    // find like find
    const cursor = await super.findOne(query, option);
    // update (?)    
    return cursor;
  }

  async loadToCache() {
    const allDocuments = await super.find().toArray();
    for (let document in allDocuments) {
      // save document
      this.redisWrapper.save(document._id, document, STRING);
      // save document's index
      this.insertIndexs(document);
    }
  }

  // not done yet!!
  insertIndexs(document) {
    const setValue = `${document._id}`;
    // clone new document, and remove it's id
    const newDocument = {
      document
    };
    delete(newDocument._id);

    for (let field in newDocument) {
      let key = `${this.name}.${field}`;
      let score = document[field];
      const value = document[field];

      // store Date value in milisecond in zset
      if (value.getTime || value._bsontype === 'Timestamp') {
        score = value.getTime() || value.toNumber();
        this.client.zadd(key, score, setValue);
        continue;
      }

      // store numberic values to zset
      if (!isNaN(value)) {
        this.client.zadd(key, score, setValue);
        continue;
      }

      // if value of field is nested object, create field's subObject
      // then insert subObject to index
      if (typeof value === 'object') {
        this.insertIndexs(this.client, this.name);
        continue;
      }

      // store orther type values in set
      const string = `${key}:${value}`;
      this.client.sadd(string, setValue);
    }
  }
}

module.exports = ThroughCollection;

// function createIndex(prefix, object, id) {
//   id = object._id || id;

//   if (!isNaN(object)) {
//     const key = `${prefix}:${object}`;
//     this.redisWrapper.save(key, id, ZSET);
//   }
// }