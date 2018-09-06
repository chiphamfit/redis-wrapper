const Wrapper = require('./wrapper');

const { HASH_SIZE, INF, NEG_INF } = require('../ulti/constant');
const {
  hexToInt,
  hashCode,
  isNotObject,
  inter,
  outer,
  union,
  diff
} = require('../ulti/helper');

class InlineWrapper extends Wrapper {
  /**
   * Create cache database from all documents in thi collection
   */
  async init() {
    // find all documents in this collection
    const documents = await this.collection.find().toArray();

    this.bucket_size = Math.ceil(documents.length / HASH_SIZE);

    // Bucket document base on it id
    for (let document of documents) {
      const id = `${document._id}`;
      const id_num = hexToInt(id);
      // Bucket all documents into hash, each store HASH_SIZE of documents
      const bucket_id = id_num % this.bucket_size;
      const bucket_key = `${this.namespace}.bucket:${bucket_id}`;
      // save document in hash
      this.redis.hset(bucket_key, id, JSON.stringify(document));
      // Indexing document
      this.indexing(document, this.namespace);
    }
  }

  /**
   * Create cache index for document
   * @param {String} id Document's id
   * @param {JSON} document Document to index
   * @param {String} prefix Prefix of document's fields
   */
  indexing(document, prefix) {
    // Clone document properties
    const sub_document = { ...document };
    const id = `${sub_document._id}`;
    delete sub_document._id;

    for (let name in sub_document) {
      const value = sub_document[name];
      // Ignor special case type = 'object' when value is BSON type
      const type = value._bsontype || typeof value;
      const index_key =
        sub_document instanceof Array ? prefix : `${prefix}.${name}`;

      // call recursion to index sub Object
      if (type === 'object') {
        this.indexing(value, index_key);
        continue;
      }

      // Indexing
      const score = hashCode(value);
      this.redis.zadd(index_key, score, id);
    }
  }

  /**
   * Selects documents in a collection and returns an array to the selected documents
   *
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document array
   */
  async find(query = {}, options = {}) {
    if (isNotObject(query)) {
      throw new TypeError('query must be an object');
    }

    if (isNotObject(options)) {
      throw new TypeError('options must be an object');
    }

    // check if query is empty
    const query_length = Object.keys(query).length;
    if (query_length === 0) {
      return await this.findAll();
    }

    if (query_length > 1) {
      query = {
        $and: [query]
      };
    }

    return await this.findByExpression(query);
  }

  /**
   * Returns one document that satisfies the specified query criteria.
   * If multiple documents satisfy the query, this method returns the first document
   * according to the natural order which reflects the order of documents on the disk.
   * In capped collections, natural order is the same as insertion order.
   * If no document satisfies the query, the method returns null.
   *
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document or null
   */
  async findOne(query = {}, option = {}) {
    const cursor = await this.findAll(query, option);
    return cursor[0] || null;
  }

  async findAll() {
    const documents = [];

    for (let i = 0; i < this.bucket_size; i++) {
      const bucket_key = `${this.namespace}.bucket:${i}`;
      const hash = await this.redis.hgetallAsync(bucket_key);

      if (hash) {
        for (let id in hash) {
          const doc = JSON.parse(hash[id]);
          documents.push(doc);
        }
      }
    }

    return documents;
  }

  /**
   * Get document by its id
   * @param {string} id
   * @returns {Promise} the promise that return a documents
   */
  async findById(id) {
    // Make sure id is a string
    id = id || '';
    // Remove "" from id string
    id = id.replace('"', '').replace('"', '');

    const id_num = hexToInt(id);
    const bucket_id = id_num % this.bucket_size;
    const bucket_key = `${this.namespace}.bucket:${bucket_id}`;

    const doc = await this.redis.hgetAsync(bucket_key, id);

    if (!doc) {
      return null;
    }

    return JSON.parse(doc);
  }

  async findByExpression(expression) {
    if (isNotObject(expression)) {
      throw new TypeError('expression must be an Object');
    }

    const expression_keys = Object.keys(expression);

    // Check expression Syntax: { field: { comparison: value} }
    // or implicit $eq { field: value }
    if (expression_keys.length !== 1) {
      throw new SyntaxError('expression must have one field');
    }

    const field = expression_keys[0];
    const field_value = expression[field];
    const field_key = `${this.namespace}.${field}`;

    if (['$and', '$or', '$nor'].indexOf(field) > -1) {
      const logical_func = this[field].bind(this);
      return await logical_func(field_value);
    }

    // implicit $eq
    if (isNotObject(field_value)) {
      const score = hashCode(field_value);
      return await this.$eq(field_key, score);
    }

    let comparison = Object.keys(field_value);
    comparison = comparison.length !== 1 ? null : comparison[0];

    if (!comparison) {
      throw new SyntaxError('comparison must have one field');
    }

    if (comparison === '$not') {
      const not_expression = {
        [field]: field_value[comparison]
      };

      return await this.$not(not_expression);
    }

    const comparison_func = this[comparison].bind(this);

    if (!comparison_func) {
      throw new SyntaxError(`comparison ${comparison} is not supported`);
    }

    const compare_value =
      field_value[comparison] instanceof Array
        ? field_value[comparison]
        : hashCode(field_value[comparison]);

    return await comparison_func(field_key, compare_value);
  }

  async $and(expressions) {
    if (!(expressions instanceof Array)) {
      throw new SyntaxError('expressions list must be an array');
    }

    const documents = [];

    for (let expression of expressions) {
      const exp_result = await this.findByExpression(expression);
      documents.push(exp_result);
    }

    return inter(documents);
  }

  async $or(expressions) {
    if (!(expressions instanceof Array)) {
      throw new SyntaxError('expressions list must be an array');
    }

    const documents = [];

    for (let expression of expressions) {
      const exp_result = await this.findByExpression(expression);
      documents.push(exp_result);
    }

    return union(documents);
  }

  async $nor(expressions) {
    if (!(expressions instanceof Array)) {
      throw new SyntaxError('expressions list must be an array');
    }
    // nor = Not(Or) = All - Or
    const all_docs = await this.findAll();
    const documents = await this.$or(expressions);

    return diff(all_docs, documents);
  }

  async $not(expression) {
    const all_docs = await this.findAll();
    const documents = await this.findByExpression(expression);

    return diff(all_docs, documents);
  }

  /**
   * The $eq operator matches documents where
   * the value of a field equals the specified value.
   *
   * @param {string} field
   * @param {number|string} value
   * @returns {Promise} return Promise that return an array of documents
   */
  async $eq(field, value) {
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
  async $gt(field, value) {
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
  async $gte(field, value) {
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
  async $in(field, values) {
    const documents = [];

    for (let value of values) {
      value = hashCode(value);
      const eqDocuments = await this.$eq(field, value);
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
  async $lt(field, value) {
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
  async $lte(field, value) {
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
  async $ne(field, value) {
    const allDocuments = await this.findAll();
    const eqDocuments = await this.$eq(field, value);
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
  async $nin(field, values) {
    let documents = await this.findAll();

    for (let value of values) {
      value = hashCode(value);
      const eqDocuments = await this.$eq(field, value);
      documents = outer(documents, eqDocuments);
    }

    return documents;
  }

  /**
   * Save and close client
   */
  async close() {
    try {
      await this.redis.bgsaveAsync();
      super.close();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean all cache data on this collection
   */
  async flush() {
    const pattern = this.namespace + '*';
    const list_key = await this.redis.keysAsync(pattern);

    for (let key of list_key) {
      this.redis.del(key);
    }
  }
}

module.exports = InlineWrapper;

// /**
//    * Execute query and return all document that suitable with query conditions
//    * @param {JSON} query query
//    * @returns {Promise} An array of documents find by query
//    */
//   async executeQuery(query) {
//     // Make sure that query is an Object
//     if (!(query instanceof Object)) {
//       throw new SyntaxError('query must be an object');
//     }

//     let cursor = [];
//     // Execute every single query and inter their results together
//     for (let key in query) {
//       let expression_result = [];

//       // key is not logical operator
//       if (LOGICAL.indexOf(key) < 0) {
//         let expression = query[key];

//         // check if expression is NOT operation
//         if (expression.$not) {
//           expression = expression.$not;
//           const all = await this.findAll();
//           const not = await this.findByExpression(expression);
//           expression_result = outer(all, not);
//         } else {
//           // implicit AND operation
//           expression_result = await this.findByExpression(expression);
//         }
//       }

//       const listExpression = query[key];

//       if (!(listExpression instanceof Array)) {
//         throw new SyntaxError(`${key} must operation on an array`);
//       }

//       if (key === '$nor') {
//         let or = [];
//         const all = await this.findAll();

//         for (let expression of listExpression) {
//           const res = await this.findByExpression(expression);
//           or = union(or, res);
//         }

//         // NOR = ALL - OR
//         expression_result = diff(all, or);
//       }

//       if (key === '$and') {
//         for (let expression of listExpression) {
//           const res = await this.findByExpression(expression);
//           expression_result = inter(expression_result, res);
//         }
//       }

//       if (key === '$or') {
//         for (let expression of listExpression) {
//           const res = await this.findByExpression(expression);
//           expression_result = union(expression_result, res);
//         }
//       }

//       cursor =
//         cursor.length === 0
//           ? expression_result
//           : inter(cursor, expression_result);
//     }

//     return cursor;
//   }
