const LazyCollection = require('./lazy_collection');

class ThroughCollection extends LazyCollection {
  async executeQuery(query) {
    return query;
  }

  async find(query, option) {
    // Check special case where we are using an ObjectId
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

  async initCacheDb() {
    // find all document on mongodb
    const allDocuments = await this.collection.find().toArray();

    // save documents as string and index it
    allDocuments.forEach(document => {
      const id = JSON.stringify(document._id);
      const body = {
        ...document
      };
      delete body._id;

      // save document as string
      this.redisWrapper.set(id, JSON.stringify(document));
      // Indexing document
      this.indexing(id, body, this.namespace);
    });
  }

  indexing(id, body, prefix) {
    for (let name in body) {
      const value = body[name];
      // Ignor special case when value is BSON type
      const type = value._bsontype || typeof value;
      const newPrefix = `${prefix}.${name}`;
      const index_key = `${newPrefix}:${value}`;

      // call recursion to index sub Object
      if (type === 'object') {
        this.indexing(id, value, newPrefix);
        continue;
      }

      // Indexing
      this.redisWrapper.sadd(index_key, id);
      // Create additional index to comparison query
      const score = toNumber(value);
      if (score) {
        this.redisWrapper.zadd(newPrefix, score, id);
      }
    }
  }
}

/**
 * Convert an object to number
 * @param {*} value 
 */
function toNumber(value) {
  let number = Number(value);
  const type = value._bsontype || typeof value;

  if (typeof number === 'number') {
    return number;
  }

  if (type === 'Timestamp') {
    return value.toNumber();
  }

  if (type === 'Date') {
    return value.getTime();
  }

  if (type === 'string') {
    number = 0;
    for (let char in value) {
      number += char.charCodeAt(0);
    }
    return number;
  }

  return number;
}

module.exports = ThroughCollection;

// function createIndex(prefix, object, id) {
//   id = object._id || id;

//   if (!isNaN(object)) {
//     const key = `${prefix}:${object}`;
//     this.redisWrapper.save(key, id, ZSET);
//   }
// }

// /**
//  * Detect typeof variable
//  * @param {*} variable variable to check
//  */
// function documentType(variable) {
//   if (variable === null) return 'null';
//   if (variable !== Object(variable)) return typeof v;
//   return ({}).toString.call(variable).slice(8, -1).toLowerCase();
// }