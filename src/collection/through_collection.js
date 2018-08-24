const LazyCollection = require('./lazy_collection');

class ThroughCollection extends LazyCollection {
  async executeQuery(query) {
    const cursor = [];

    // dummy result
    return query;
  }

  applyOptions(cursor, options) {
    // dummy result
    return [cursor, options];
  }

  async find(query, options) {
    // Check special case where we are using an ObjectId
    if (query && query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    // scan in redis fisrt
    const cursor = await this.executeQuery(query);

    // Apply Options for cursor
    const result = this.applyOptions(cursor, options);

    // if can't found in cache, try to find in lazy-cache mode
    if (result.length === 0) {
      return await super.find(query, options);
    }

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
      // Ignor special case type = 'object' when value is additional BSON type
      const type = value._bsontype || typeof value;
      const index_key = `${prefix}.${name}`;

      // call recursion to index sub Object
      if (type === 'object') {
        this.indexing(id, value, index_key);
        continue;
      }

      // Indexing
      const score = hashCode(value);
      this.redisWrapper.zadd(index_key, score, id);
    }
  }
}

/**
 * Convert an object's value to 32-bit int base on its stringify
 * @param {*} value 
 * @returns a 32-bit integer
 */
function hashCode(value) {
  // Stringify value and convert it to number by its charCode
  const str_value = typeof value !== 'string' ? JSON.stringify(value) : value;
  let hash = 0;
  if (str_value.length === 0) {
    return hash;
  }

  for (let i = 0, length = str_value.length; i < length; i++) {
    const char = str_value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // convert hash to 32-bit int
  }

  return hash;
}

module.exports = ThroughCollection;