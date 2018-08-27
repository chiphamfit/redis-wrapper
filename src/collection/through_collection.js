const LazyCollection = require('./lazy_collection');

const COMPLEX_COMPARISON = ['$in', '$nin'];
const COMPARISON = ['$eq', '$ne', '$lt', '$lte', '$gt', '$gte'];
const LOGICAL = ['$and', '$or', '$nor', '$not'];
const OPERATORS = [...COMPLEX_COMPARISON, ...COMPARISON, ...LOGICAL];

class ThroughCollection extends LazyCollection {
  /**
   * Execute the standard query
   * @param {Array} query A standardized query
   * @returns {Array} An array of documents find by query
   */
  async executeQuery(standardQuery) {
    // Make sure that query is an array
    if (!(standardQuery instanceof Array)) {
      standardQuery = [standardQuery];
    }

    let cursor = [];

    // Execute every single query and join them results together
    for (let i in standardQuery) {
      const query = standardQuery[i];
      for (let key in query) {
        switch (key) {
        case '$and':
          // ignore
          break;
        case '$or':
          // do or
          break;
        case '$not':
          // add '$nin' maybe
          break;
        case '$nor':
          break;
        }

        if (COMPARISON.indexOf(key) > 0) {
          let comparison = query[key];
          const operator = key;
          // Make sure comparison is an Array
          if (!(comparison instanceof Array)) {
            comparison = [comparison];
          }
        }

        const queryResult = await this.redisWrapper.compare(key, query[key]);
        cursor.push(...queryResult);
      }
    }

    // convert cursor from set to array
    return cursor;
  }

  and() {}

  or() {}

  not() {}

  xor() {}

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
    const standard_query = this.standarizeQuery(query);

    // Standardize the options

    // Find in cache first
    const cursor = await this.executeQuery(standard_query);

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

/**
 * Convert mongo's query to custom standar query
 * @param {JSON} query mongo find's query
 * @param {String} prefix Prefix
 * @return {Array} An array of condition in orginal query
 */
function standarizeQuery(query, prefix = '') {
  const standardQuery = [];

  // Iterate each operator in query
  // { $operator: [ { <expression1> }, { <expression2> } , ... , { <expressionN> } ] }

  for (let operator in query) {
    let expressions = query[operator];
    const nextPrefix =
      OPERATORS.indexOf(operator) < 0 && query instanceof Array
        ? prefix
        : `${prefix}.${operator}`;
    const subQuery = standarizeQuery(expressions, nextPrefix);

    // If operator is logical operator
    if (LOGICAL.indexOf(operator) > -1) {
      // Check syntax for operator
      if (operator === '$not') {
        if (expressions.length !== 1) {
          throw new SyntaxError(`${operator} must has one expression`);
        }
      } else {
        if (!(expressions instanceof Array)) {
          throw new SyntaxError(
            `${operator}'s value must be an array of expressions`
          );
        }

        if (expressions.length < 2) {
          throw new SyntaxError(
            `${operator} must has at least two expressions`
          );
        }
      }

      let subExpression = {};
      subExpression[operator] = operator === '$not' ? subQuery[0] : subQuery;
      // Create sub query and add it to standard query
      standardQuery.push(subExpression);
      continue;
    }

    // operator is complex comparison operator
    if (COMPLEX_COMPARISON.indexOf(operator) > -1) {
      // Make sure value is an Array
      if (!(expressions instanceof Array)) {
        expressions = [expressions];
      }

      // Hash value of query
      const hashValue = expressions.map(value => {
        return hashCode(value);
      });

      const subQuery = {
        [operator]: {
          [prefix]: hashValue
        }
      };

      standardQuery.push(subQuery);
      continue;
    }

    // operator is comparison operator
    if (COMPARISON.indexOf(operator) > -1) {
      // Check syntax
      if (!prefix) {
        throw new SyntaxError('Comparison queries must in field lable');
      }

      // Create sub query and add it to standard query
      const subQuery = standarizeQuery(expressions, prefix);

      if (subQuery.length !== 1) {
        throw new SyntaxError('Comparison queries must contain one value');
      }

      standardQuery.push({
        [operator]: subQuery[0]
      });
      continue;
    }

    // call recursion to index sub Object
    if (expressions instanceof Object) {
      const subQuery = standarizeQuery(expressions, nextPrefix);
      standardQuery.push(...subQuery);
      continue;
    }

    // Convert value to hashCode
    const score = hashCode(expressions);
    // add new operator to query
    let newQuery = {};
    newQuery[nextPrefix] = score;
    standardQuery.push(newQuery);
  }

  return standardQuery;
}

module.exports = {
  ThroughCollection,
  standarizeQuery
};
