const Wrapper = require('./wrapper');
const LazyWrapper = require('./lazyWrapper');

const { LOGICAL, NO_EXPIRE, INF, NEG_INF } = require('../ulti/constant');
const { hashCode, inter, outer, union, diff } = require('../ulti/helper');

class InlineWrapper extends Wrapper {
  constructor(collection, redis) {
    super(collection, redis);
    this.LazyWrapper = new LazyWrapper(collection, redis, NO_EXPIRE);
  }

  async find(query = {}, options = {}) {
    // Check special case where we are using an ObjectId
    if (query && query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    if (query && !(query instanceof Object)) {
      throw new TypeError('query must be an object');
    }

    if (options && !(options instanceof Object)) {
      throw new TypeError('options must be an object');
    }

    // check if query is empty
    if (Object.keys(query).length === 0) {
      return await this.findAll();
    }

    // Requery
    const _query = requery(query);

    // Find in cache first
    const cursor = await this.executeQuery(_query);

    // // if can't found in cache, try to find in lazy-cache mode
    // if (cursor.length === 0) {
    //   return await super.find(query, options);
    // }

    return cursor;
  }

  async findAll() {
    return this.LazyWrapper.find();
  }

  async findOne(query = {}, option = {}) {
    // dummy function
    const cursor = await super.findOne(query, option);
    return cursor;
  }

  /**
   * Get document by its id
   * @param {string} id
   * @returns {Promise} the promise that return a documents
   */
  async findById(id) {
    const doc = await this.redis.getAsync(id);

    if (!doc) {
      return null;
    }

    return JSON.parse(doc);
  }

  /**
   * Create cache database from all documents in thi collection
   */
  async init() {
    // find all document in this collection
    const documents = await this.findAll();
    const ndocuments = documents.length;
    const buffer = 10000;
    const nloop = ndocuments / buffer;

    // Store documents in small hash to optimize memory
    for (let i = 0; i < nloop; i++) {
      const hashKey = `${this.namespace}:${i}`;

      for (let j = 0; j < buffer; j++) {
        const index = j + i * buffer;
        const document = documents[index];
        // create sub document
        const id = JSON.stringify(document._id);
        const subDocument = { ...document };
        delete subDocument._id;

        // save document in hash
        this.redis.hset(hashKey, id, JSON.stringify(document));
        // Indexing document
        this.indexing(id, subDocument);
      }
    }
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
      this.redis.zadd(index_key, score, id);
    }
  }

  /**
   * Get all documents in this collection
   */
  async getAllDocument() {
    const listIds = await this.redis.smembersAsync(this.namespace);

    if (!listIds) {
      return [];
    }

    let documents = '';

    for (let id of listIds) {
      const doc = await this.redis.getAsync(id);
      documents += doc + ',';
    }

    documents = documents.slice(0, -1);
    documents = '[' + documents + ']';
    documents = JSON.parse(documents);

    return documents;
  }

  /**
   * The $eq operator matches documents where
   * the value of a field equals the specified value.
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async eq(field, value) {
    const min = `${value}`;
    const max = `${value}`;
    const ids = await this.redis.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.findById(id);
      documents.push(document);
    }

    return documents;
  }

  /**
   * $gt selects those documents where the value of the field
   * is greater than the specified value.
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async gt(field, value) {
    const min = `(${value}`;
    const max = INF;
    const ids = await this.redis.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.findById(id);
      documents.push(document);
    }

    return documents;
  }

  /**
   * $gte selects the documents where the value of the field
   * is greater than or equal to a specified value
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async gte(field, value) {
    const min = `${value}`;
    const max = INF;
    const ids = await this.redis.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.findById(id);
      documents.push(document);
    }

    return documents;
  }

  /**
   * The $in operator selects the documents where the value of
   * a field equals any value in the specified array
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async in(field, values) {
    const documents = [];

    for (let value of values) {
      const eqDocuments = await this.eq(field, value);
      documents.push(...eqDocuments);
    }

    return documents;
  }

  /**
   * $lt selects the documents where the value of the field is less than the specified value
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async lt(field, value) {
    const min = NEG_INF;
    const max = `(${value}`;
    const ids = await this.redis.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.findById(id);
      documents.push(document);
    }

    return documents;
  }

  /**
   * $lte selects the documents where the value of the field
   * is less than or equal to the specified value.
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async lte(field, value) {
    const min = NEG_INF;
    const max = `${value}`;
    const ids = await this.redis.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.findById(id);
      documents.push(document);
    }

    return documents;
  }

  /**
   * $ne selects the documents where the value of the field is not equal to the specified value.
   * This includes documents that do not contain the field.
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async ne(field, value) {
    const allDocuments = await this.getAllDocument();
    const eqDocuments = await this.eq(field, value);
    const documents = outer(allDocuments, eqDocuments);

    return documents;
  }

  /**
   * $nin selects the documents where:
   * the field value is not in the values or
   * the field does not exist.
   *
   * @param {string} field
   * @param {number|string} values
   * @returns {Promise} return Promise that return an array of documents
   */
  async nin(field, values) {
    let documents = await this.getAllDocument();

    for (let value of values) {
      const eqDocuments = await this.eq(field, value);
      documents = outer(documents, eqDocuments);
    }

    return documents;
  }

  /**
   * Returns all document that satisfies the expression.
   *
   * @param {Object} expression Optional. The express
   */
  async findByExpression(expression) {
    if (expression === undefined) {
      return await this.getAllDocument();
    }

    return await this.findByExpression(expression, this.namespace);
  }

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
          const all = await this.getAllDocument();
          const not = await this.findByExpression(expression);
          expression_result = outer(all, not);
        } else {
          // implicit AND operation
          expression_result = await this.findByExpression(expression);
        }
      }

      const listExpression = query[key];

      if (!(listExpression instanceof Array)) {
        throw new SyntaxError(`${key} must operation on an array`);
      }

      if (key === '$nor') {
        let or = [];
        const all = await this.getAllDocument();

        for (let expression of listExpression) {
          const res = await this.findByExpression(expression);
          or = union(or, res);
        }

        // NOR = ALL - OR
        expression_result = diff(all, or);
      }

      if (key === '$and') {
        for (let expression of listExpression) {
          const res = await this.findByExpression(expression);
          expression_result = inter(expression_result, res);
        }
      }

      if (key === '$or') {
        for (let expression of listExpression) {
          const res = await this.findByExpression(expression);
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

  async close() {
    await this.redis.bgsaveAsync();
    super.close();
  }
}

function requery(query) {
  if (!(query instanceof Object)) {
    throw new TypeError('query must be an Object');
  }

  const fields = Object.keys(query);
  const nField = fields.length;

  if (nField < 2) {
    return query;
  }

  const expressions = [];
  for (let field in fields) {
    const exp = {
      [field]: query[field]
    };

    expressions.push(exp);
  }

  const newQuery = {
    $and: expressions
  };

  return newQuery;
}

// /**
//  * Convert mongo's query to custom standar query
//  * @param {JSON} query mongo find's query
//  * @param {String} prefix Prefix
//  * @return {Array} An array of conditon in orginal query
//  */
// function standarizeQuery(query, prefix) {
//   const standar_query = [];
//   prefix = prefix || this.namespace;

//   for (let property in query) {
//     let value = query[property];
//     const index_key = `${prefix}.${property}`;

//     // check if this field is ope
//     const operator = [
//       '$and',
//       '$or',
//       '$nor',
//       '$not',
//       '$eq',
//       '$ne',
//       '$lt',
//       '$lte',
//       '$gt',
//       '$gte'
//     ];
//     if (operator.indexOf(property) > -1) {
//       let subQuery = {};
//       subQuery[property] = this.standarizeQuery(value, prefix);
//       standar_query.push(subQuery);
//       continue;
//     }

//     // call recursion to index sub Object
//     if (typeof value === 'object') {
//       const subQuery = this.standarizeQuery(value, index_key);
//       standar_query.push(...subQuery);
//       continue;
//     }

//     // Indexing
//     const score = hashCode(value);
//     // add new property to query
//     let newQuery = {};
//     newQuery[index_key] = score;
//     standar_query.push(newQuery);
//   }

//   return standar_query;
// }

module.exports = InlineWrapper;
