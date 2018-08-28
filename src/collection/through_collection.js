const LazyCollection = require('./lazy_collection');

// const COMPLEX_COMPARISON = ['$in', '$nin'];
// const OPERATORS = [...COMPLEX_COMPARISON, ...COMPARISON, ...LOGICAL];
const INF = 'inf';
const NEG_INF = '-inf';
const LOGICAL = ['$and', '$or', '$nor', '$not'];
const COMPARISON = ['$eq', '$ne', '$lt', '$lte', '$gt', '$gte', '$in', '$nin'];

class ThroughCollection extends LazyCollection {
  /**
   * Execute the standard query
   * @param {Array} query A standardized query
   * @returns {Array} An array of documents find by query
   */
  async executeQuery(query) {
    // Make sure that query is an Object
    if (!(query instanceof Object)) {
      throw new SyntaxError('query must be an Object');
    }

    let cursor = [];
    const count = [];
    const andExpressions = [];
    const arrDocuments = [];

    // Execute every single query and inter them results together
    for (let key in query) {
      const expression = query[key];

      if (key === '$not') {
        const expressionResult = await this.not(expression);
        arrDocuments.push(...expressionResult);
        continue;
      }

      if (key === '$nor') {
        const expressionResult = await this.nor(expression);
        arrDocuments.push(...expressionResult);
        continue;
      }

      if (key === '$and') {
        const expressionResult = await this.and(expression);
        arrDocuments.push(...expressionResult);
        continue;
      }

      if (key === '$or') {
        const expressionResult = await this.or(expression);
        arrDocuments.push(...expressionResult);
        continue;
      }

      andExpressions.push(expression);
    }

    cursor.push(this.and(andExpressions));
    // unique cursor

    return cursor;
  }

  /**
   *
   * @param {Object} expression
   */
  async not(expression) {
    if (!(expression instanceof Object)) {
      throw new SyntaxError('$not expression must be an Object');
    }

    let operator = '$eq';
    let not_operator = '$ne';

    // get operator of expression
    for (let key in expression) {
      operator = key;
      break;
    }

    // change operator
    switch (operator) {
    case '$eq':
      not_operator = '$ne';
      break;
    case '$gt':
      not_operator = '$lte';
      break;
    case 'gte':
      not_operator = '$lt';
      break;
    case '$in':
      not_operator = '$nin';
      break;
    case '$lt':
      not_operator = '$gte';
      break;
    case '$lte':
      not_operator = '$gt';
      break;
    case '$ne':
      not_operator = '$eq';
      break;
    case '$nin':
      not_operator = '$in';
      break;
    default:
      throw new SyntaxError('operator-expression not exist');
    }

    const not_expression = {
      [not_operator]: expression[operator]
    };

    return await this.compare(not_expression);
  }

  /**
   * $and: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ]
   * @param {Array} arrExpressions
   * @return {Array} Documents that suitable with all expressions
   */
  async and(arrExpressions) {
    if (!(arrExpressions instanceof Array)) {
      throw new SyntaxError('$and expression must be an array');
    }

    const count = [];
    const cursor = [];
    const arrDocuments = [];

    for (let expression of arrExpressions) {
      // check if nested logical
      let operator = '';

      // get operator of expression
      for (let key in expression) {
        operator = key;
        break;
      }

      if (COMPARISON.indexOf(operator) < 0) {
        return this.executeQuery(expression[operator]);
      }

      const compareResult = await this.redisWrapper.compare(expression);
      arrDocuments.push(...compareResult);
    }

    // Inter
    // if document exist in count array add to result
    // else add it to count array
    for (let document in arrDocuments) {
      const id = document._id;

      if (!count[id]) {
        count[id] = 1;
      } else {
        cursor.push(document);
      }
    }

    return cursor;
  }

  /**
   * $or: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ]
   * @param {Array} arrExpressions
   * @return {Array} Documents that suitable with one of expressions
   */
  async or(arrExpressions) {
    if (!(arrExpressions instanceof Array)) {
      throw new SyntaxError('$or expression must be an array');
    }

    const count = [];
    const cursor = [];
    const arrDocuments = [];

    for (let expression of arrExpressions) {
      // check if nested logical
      let operator = '';

      // get operator of expression
      for (let key in expression) {
        operator = key;
        break;
      }

      if (COMPARISON.indexOf(operator) < 0) {
        return this.executeQuery(expression[operator]);
      }

      const compareResult = await this.redisWrapper.compare(expression);
      arrDocuments.push(...compareResult);
    }

    // Union
    for (let document in arrDocuments) {
      const id = document._id;

      if (!count[id]) {
        count[id] = 1;
        cursor.push(document);
      } else {
        count[id] += 1;
      }
    }

    return cursor;
  }

  /**
   * $nor: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ]
   * @param {Array} arrExpressions
   * @return {Array} Documents that not suitable with all expressions
   */
  async nor(arrExpressions) {
    const cursor = [];
    const allDocuments = await this.find();
    const andDocuments = await this.and(arrExpressions);

    // nor = ALL - and(A, B, ...)
    allDocuments.forEach(document => {
      let notInAndDoc = false;

      andDocuments.forEach(andDocument => {
        if (document._id === andDocument._id) {
          notInAndDoc = true;
        }
      });

      if (notInAndDoc) {
        cursor.push(document);
      }
    });

    return cursor;
  }

  /** { field: { operator: value } } || { field: value }
   * Find all document in zset that suitable the condition
   * @param {Object} expression expression = { field: { operator: <value> } } || { field: <value> }
   * @returns {Array} an Array of documents that matches the operator conditions
   */
  async executeExpression(expression = {}) {
    if (!(expression instanceof Object)) {
      throw new SyntaxError('Compare\'s expression must be an Object');
    }

    // Init the expression values
    const field = Object.keys(expression)[0];
    let value = expression[field];
    let operator = '$eq';
    let listDocuments = [];

    if (value instanceof Object) {
      operator = Object.keys(value)[0];
      value = value[operator];
    }

    // Execute
    if (operator === '$in') {
      if (!(value instanceof Array)) {
        throw new SyntaxError('Value of operator $in must be an array');
      }

      for (let condition of value) {
        const eqDocuments = await this.executeExpression({
          [field]: condition
        });

        listDocuments.push(...eqDocuments);
      }
    }

    if (operator === '$ne') {
      const gtDocuments = await this.executeExpression({
        [field]: { $gt: value }
      });

      const ltDocuments = await this.executeExpression({
        [field]: { $lt: value }
      });

      listDocuments.push(...gtDocuments, ...ltDocuments);
    }

    if (operator === '$nin') {
      if (!(value instanceof Array)) {
        throw new SyntaxError('Value of operator $nin must be an array');
      }

      if (value.length === 1) {
        return await this.compare({ [field]: { $ne: value[0] } });
      }

      value = value.sort();
      let range = [];

      // re-write
      // Create range of score to search
      for (let i = 0, length = value.length; i < length - 1; i++) {
        let min = `(${value[i]}`;
        let max = `(${value[i + 1]}` || INF;

        if (i === 0) {
          range.push([field, NEG_INF, min]);
        }

        range.push([field, min, max]);

        if (i === length - 2) {
          range.push([field, max, INF]);
        }
      }

      const listIds = [];

      for (let i in range) {
        const rangeScan = await this.zrangebyscoreAsync(range[i]);
        listIds.push(...rangeScan);
      }

      for (let i in listIds) {
        const document = await super.getAsync(listIds[i]);
        listDocuments.push(JSON.parse(document));
      }
    }

    switch (operator) {
    case '$eq':
      range = [key, `${condition}`, `${condition}`];
      break;
    case '$gt':
      range = [key, `(${condition}`, INF];
      break;
    case '$gte':
      range = [key, `${condition}`, INF];
      break;
    case '$lt':
      range = [key, NEG_INF, `(${condition}`];
      break;
    case '$lte':
      range = [key, NEG_INF, `${condition}`];
      break;
    default:
      throw new Error('operator is not supported');
    }

    const listIds = await super.zrangebyscoreAsync(range);

    for (let i in listIds) {
      const document = await super.getAsync(listIds[i]);
      listDocuments.push(JSON.parse(document));
    }

    return listDocuments;
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

// /**
//  * Convert mongo's query to custom standar query
//  * @param {JSON} query mongo find's query
//  * @param {String} prefix Prefix
//  * @return {Array} An array of condition in orginal query
//  */
// function standarizeQuery(query, prefix = '') {
//   let standardQuery = { ...query };

//   for (let property in standardQuery) {
//     const value = query[property];
//     const isLogical = LOGICAL.indexOf(property) > -1;

//     if (property === '$not') {
//       if (!(value instanceof Object)) {
//         throw new SyntaxError('$not operator value must be a Object');
//       }

//       if (Object.keys(value).length !== 1) {
//         throw new SyntaxError(
//           '$not operator-expression must have one property'
//         );
//       }

//       return standardQuery;
//     }

//     if (isLogical) {
//       standardQuery[property] = standarizeQuery(value);
//     }
//   }

//   return standardQuery;
// }

module.exports = ThroughCollection;

//   const nextPrefix = queryIsArray ? prefix : `${prefix}.${operator}`;
//   const subQuery = standarizeQuery(expressions, nextPrefix);

//   // If operator is logical operator
//   if (LOGICAL.indexOf(operator) > -1) {
//     // Check syntax for operator
//     if (operator === '$not') {
//       if (expressions.length !== 1) {
//         throw new SyntaxError(`${operator} must has one expression`);
//       }
//     } else {
//       if (!(expressions instanceof Array)) {
//         throw new SyntaxError(
//           `${operator}'s value must be an array of expressions`
//         );
//       }

//       if (expressions.length < 2) {
//         throw new SyntaxError(
//           `${operator} must has at least two expressions`
//         );
//       }
//     }

//     let subExpression = {};
//     subExpression[operator] = operator === '$not' ? subQuery[0] : subQuery;
//     // Create sub query and add it to standard query
//     standardQuery.push(subExpression);
//     continue;
//   }

//   // operator is complex comparison operator
//   if (COMPLEX_COMPARISON.indexOf(operator) > -1) {
//     // Make sure value is an Array
//     if (!(expressions instanceof Array)) {
//       expressions = [expressions];
//     }

//     // Hash value of query
//     const hashValue = expressions.map(value => {
//       return hashCode(value);
//     });

//     const subQuery = {
//       [operator]: {
//         [prefix]: hashValue
//       }
//     };

//     standardQuery.push(subQuery);
//     continue;
//   }

//   // operator is comparison operator
//   if (COMPARISON.indexOf(operator) > -1) {
//     // Check syntax
//     if (!prefix) {
//       throw new SyntaxError('Comparison queries must in field lable');
//     }

//     // Create sub query and add it to standard query
//     const subQuery = standarizeQuery(expressions, prefix);

//     if (subQuery.length !== 1) {
//       throw new SyntaxError('Comparison queries must contain one value');
//     }

//     standardQuery.push({
//       [operator]: subQuery[0]
//     });
//     continue;
//   }

//   // call recursion to index sub Object
//   if (expressions instanceof Object) {
//     const subQuery = standarizeQuery(expressions, nextPrefix);
//     standardQuery.push(...subQuery);
//     continue;
//   }

//   // Convert value to hashCode
//   const score = hashCode(expressions);
//   // add new operator to query
//   let newQuery = {};
//   newQuery[nextPrefix] = score;
//   standardQuery.push(newQuery);
// }
