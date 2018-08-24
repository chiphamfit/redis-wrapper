const LazyCollection = require('./lazy_collection');

class ThroughCollection extends LazyCollection {
  async executeQuery(query) {
    if (!(query instanceof Object)) {
      throw new TypeError('query must be an object');
    }

    let cursor = new Set();

    query.forEach(condition => {
      if ('$and' in condition) {
        //
      }

      if ('$or' in condition) {
        //
      }

      if ('$not' in condition) {
        //
      }

      if ('$nor' in condition) {
        //
      }

      for (let property in condition) {
        // and
        const value = query[property];
        const score = this.hashCode(value);
        const index_key = `${this.namespace}.${property}`;
        // join result
        cursor.add(...documentsByProperty);
      }
    });

    // convert cursor from set to array
    return [...cursor];
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

    if (typeof query !== 'object') {
      throw new TypeError('query must be an object');
    }

    if (typeof options !== 'object') {
      throw new TypeError('options must be an object');
    }

    // Standardize the query
    const standar_query = this.standarizeQuery(query);

    // Standardize the options

    // Find in cache first
    const cursor = await this.executeQuery(standar_query);

    // Apply Options for cursor
    const result = this.applyOptions(cursor, options);

    // if can't found in cache, try to find in lazy-cache mode
    if (result.length === 0) {
      return await super.find(query, options);
    }

    return result;
  }

  async findOne(query, option) {
    // dummp function
    const cursor = await super.findOne(query, option);
    return cursor;
  }

  /**
   * Create cache database from all documents in thi collection
   */
  async initCache() {
    // find all document on mongodb
    const allDocuments = await this.collection.find().toArray();

    // save documents as string and index it
    allDocuments.forEach(document => {
      const id = JSON.stringify(document._id);
      const subDocument = {
        ...document
      };
      delete subDocument._id;

      // save document as string
      this.redisWrapper.set(id, JSON.stringify(document));
      // Indexing document
      this.indexing(id, subDocument);
    });
  }

  /**
   * Create cache index for document
   * @param {String} id Document's id
   * @param {JSON} document Document to index
   * @param {String} prefix Prefix of document's fields
   */
  indexing(id, document, prefix) {
    prefix = prefix || this.namespace;

    for (let name in document) {
      const value = document[name];
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

  /**
   * Convert mongo's query to custom standar query
   * @param {JSON} query mongo find's query
   * @param {String} prefix Prefix
   * @return {Array} An array of conditon in orginal query
   */
  standarizeQuery(query, prefix) {
    const standar_query = [];
    prefix = prefix || this.namespace;

    for (let property in query) {
      let value = query[property];
      const index_key = `${prefix}.${property}`;

      // check if this field is ope
      const operator = [
        '$and',
        '$or',
        '$nor',
        '$not',
        '$eq',
        '$ne',
        '$lt',
        '$lte',
        '$gt',
        '$gte'
      ];
      if (operator.indexOf(property) > -1) {
        let subQuery = {};
        subQuery[property] = this.standarizeQuery(value, prefix);
        standar_query.push(subQuery);
        continue;
      }

      // call recursion to index sub Object
      if (typeof value === 'object') {
        const subQuery = this.standarizeQuery(value, index_key);
        standar_query.push(...subQuery);
        continue;
      }

      // Indexing
      const score = hashCode(value);
      // add new property to query
      let newQuery = {};
      newQuery[index_key] = score;
      standar_query.push(newQuery);
    }

    return standar_query;
  }
}

//////////////////////////// Sub function //////////////////////////////
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
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert hash to 32-bit int
  }

  return hash;
}

module.exports = ThroughCollection;
