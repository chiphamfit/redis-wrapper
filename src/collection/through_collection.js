const LazyCollection = require('./lazy_collection');
const { inter, outer, union, notIn } = require('../redis_wrapper');

const LOGICAL = ['$and', '$or', '$nor'];

class ThroughCollection extends LazyCollection {
  /**
   * Execute query and return all document that suitable with query conditions
   * @param {JSON} query query
   * @returns {Promise} An array of documents find by query
   */
  async executeQuery(query) {
    // Make sure that query is an Object
    if (!(query instanceof Object)) {
      throw new SyntaxError('query must be an object');
    }

    let cursor = [];

    // Execute every single query and inter their results together
    for (let key in query) {
      let expression_result = [];

      // key is not logical operator
      if (LOGICAL.indexOf(key) < 0) {
        let expression = query[key];

        // check if expression is NOT operation
        if (expression.$not) {
          expression = expression.$not;
          const all = this.redisWrapper.getAllDocument(this.namespace);
          const not = await this.executeExpression(expression);
          expression_result = outer(all, not);
        } else {
          // implicit AND operation
          expression_result = await this.executeExpression(expression);
        }
      }

      const listExpression = query[key];

      if (!(listExpression instanceof Array)) {
        throw new SyntaxError(`${key} must operation on an array`);
      }

      if (key === '$nor') {
        let or = [];
        const all = this.redisWrapper.getAllDocument(this.namespace);

        for (let expression of listExpression) {
          const res = await this.executeExpression(expression);
          or = union(or, res);
        }

        // NOR = ALL - OR
        expression_result = notIn(all, or);
      }

      if (key === '$and') {
        for (let expression of listExpression) {
          const res = await this.executeExpression(expression);
          expression_result = inter(expression_result, res);
        }
      }

      if (key === '$or') {
        for (let expression of listExpression) {
          const res = await this.executeExpression(expression);
          expression_result = union(expression_result, res);
        }
      }

      cursor =
        cursor.length === 0
          ? expression_result
          : inter(cursor, expression_result);
    }

    return cursor;
  }

  /** { field: { operator: value } } || { field: value }
   * Find all document in zset that suitable the condition
   * @param {Object} expression expression = { field: { operator: <value> } } || { field: <value> }
   * @returns {Array} an Array of documents that matches the operator conditions
   */
  async executeExpression(expression) {
    if (!(expression instanceof Object)) {
      throw new SyntaxError('Compare\'s expression must be an Object');
    }

    // Init the expression's values
    const field = Object.keys(expression)[0];
    let value = expression[field];
    let operator = '$eq';

    // check if expression has form { field: { operator: value } }
    if (value instanceof Object) {
      operator = Object.keys(value)[0];
      value = value[operator];
    }

    value = hashCode(value);

    // Execute
    switch (operator) {
    case '$eq':
      return this.redisWrapper.eq(field, value);
    case '$gt':
      return this.redisWrapper.gt(field, value);
    case '$gte':
      return this.redisWrapper.gte(field, value);
    case '$in':
      return this.redisWrapper.in(field, value);
    case '$lt':
      return this.redisWrapper.lt(field, value);
    case '$lte':
      return this.redisWrapper.lte(field, value);
    case '$ne':
      return this.redisWrapper.ne(field, value);
    case '$nin':
      return this.redisWrapper.nin(field, value);
    default:
      throw new Error('operator is not supported');
    }
  }

  async find(query, options) {
    // Check special case where we are using an ObjectId
    if (query && query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    if (query && typeof query !== 'object') {
      throw new TypeError('query must be an object');
    }

    if (options && typeof options !== 'object') {
      throw new TypeError('options must be an object');
    }

    // Find in cache first
    if (query === undefined) {
      return await this.redisWrapper.getAllDocument(this.namespace);
    }

    const cursor = await this.executeQuery(query);

    // // if can't found in cache, try to find in lazy-cache mode
    // if (cursor.length === 0) {
    //   return await super.find(query, options);
    // }

    return cursor;
  }

  async findOne(query, option) {
    // dummy function
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
      // save list of document in collection
      this.redisWrapper.sadd(this.namespace, id);
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
      const index_key =
        document instanceof Array ? prefix : `${prefix}.${name}`;

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

  for (let i in str_value) {
    const char = str_value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert hash to 32-bit int
  }

  return hash;
}

module.exports = ThroughCollection;
