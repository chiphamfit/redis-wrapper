const LazyCaching = require('./lazyCache');
const { LOGICAL } = require('../ulti/constant');
const { hashCode, inter, outer, union, diff } = require('../ulti/helper');

class FullyCaching extends LazyCaching {
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
      return await this.findByExpression();
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

  async findOne(query = {}, option = {}) {
    // dummy function
    const cursor = await super.findOne(query, option);
    return cursor;
  }

  /**
   * Create cache database from all documents in thi collection
   */
  async initCache() {
    try {
      // find all document on mongodb
      const allDocuments = await this.collection.find().toArray();

      // save documents as string and index it
      allDocuments.forEach(document => {
        const id = JSON.stringify(document._id);
        const subDocument = { ...document };
        delete subDocument._id;

        // save document as string
        this.cacher.set(id, JSON.stringify(document));
        // save list of document in collection
        this.cacher.sadd(this.namespace, id);
        // Indexing document
        this.indexing(id, subDocument);
      });
    } catch (error) {
      throw error;
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
      this.cacher.zadd(index_key, score, id);
    }
  }

  /**
   * Returns all document that satisfies the expression.
   *
   * @param {Object} expression Optional. The express
   */
  async findByExpression(expression) {
    try {
      if (expression === undefined) {
        return await this.cacher.getAllDocument(this.namespace);
      }

      return await this.cacher.findByExpression(expression, this.namespace);
    } catch (error) {
      throw error;
    }
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
          const all = await this.cacher.getAllDocument(this.namespace);
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
        const all = await this.cacher.getAllDocument(this.namespace);

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

module.exports = FullyCaching;
