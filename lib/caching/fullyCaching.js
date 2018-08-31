const LazyCaching = require('./lazyCaching');
const { LOGICAL } = require('../ulti/constant');
const { hashCode, inter, outer, union, diff } = require('../ulti/helper');

class FullyCaching extends LazyCaching {
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
    const cursor = await this.executeQuery(query);

    // if can't found in cache, try to find in lazy-cache mode
    if (cursor.length === 0) {
      return await super.find(query, options);
    }

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

  async findByExpression(expression) {
    let documents = [];

    try {
      if (expression === undefined) {
        documents = await this.cacher.getAllDocument(this.namespace);
        return documents;
      }

      documents = await this.cacher.findByExpression(
        expression,
        this.namespace
      );

      return documents;
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

module.exports = FullyCaching;
