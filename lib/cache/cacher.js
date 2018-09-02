const {
  promisifyAll,
  isRedisClient,
  RedisClient,
  hashCode,
  outer
} = require('../ulti/helper');

const {
  NO_EXPIRE,
  FIRST_CURSOR,
  NEXT_CURSOR_INDEX,
  DATA_INDEX,
  INF,
  NEG_INF
} = require('../ulti/constant');

class Cacher {
  /**
   * Create a wrapper for redis client
   * @param {RedisClient} redis A redis client
   * @param {Number} expire Time to life of cache data
   */
  constructor(redis, expire) {
    // Override constructor
    // Check if redis is bypassed
    if (!isNaN(redis) && !expire) {
      expire = NO_EXPIRE;
      redis = RedisClient();
    }

    if (!isRedisClient(redis)) {
      throw new TypeError('redis must be a RedisClient');
    }

    // Check if expire is a number
    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive Number');
    }

    this.redis = redis;
    this.expire_time = expire;

    // convert all function in redis to async
    promisifyAll(this.redis);

    // Clone all redis client's function to this
    for (let key in this.redis) {
      const func = this.redis[key];

      if (func instanceof Function) {
        this[key] = func.bind(this.redis);
      }
    }
  }

  /**
   * Set a timeout on keys. After the timeout has expired,
   * the key will automatically be deleted.
   * If the expire time is setted to NO_EXPIRE do nothing
   *
   * @param {[number]} keys
   */
  setExpire(...keys) {
    if (this.expire_time === NO_EXPIRE) {
      return;
    }

    try {
      for (let key of keys) {
        this.expire(key, this.expire_time);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get document by its id
   *
   * @param {string} id
   * @returns {Promise} the promise that return a documents
   */
  async getDocument(id) {
    const doc = await this.getAsync(id);

    if (!doc) {
      return null;
    }

    return JSON.parse(doc);
  }

  /**
   * Get all documents in this collection
   */
  async getAllDocument(collection) {
    let nextCursor = FIRST_CURSOR;
    const documents = [];

    do {
      const scanResult = await this.sscanAsync(collection, nextCursor);
      // update query's nextCursor
      nextCursor = scanResult[NEXT_CURSOR_INDEX];

      // add document to result
      const arr_id = scanResult[DATA_INDEX];
      if (arr_id) {
        for (let id of arr_id) {
          const document = await this.getAsync(id);
          documents.push(JSON.parse(document));
        }
      }
    } while (nextCursor !== FIRST_CURSOR);

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
    const ids = await this.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.getDocument(id);
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
    const ids = await this.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.getDocument(id);
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
    const ids = await this.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.getDocument(id);
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
    const ids = await this.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.getDocument(id);
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
    const ids = await this.zrangebyscoreAsync(field, min, max);
    const documents = [];

    for (let id of ids) {
      const document = await this.getDocument(id);
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
  async ne(field, value, collection) {
    const allDocuments = await this.getAllDocument(collection);
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
  async nin(field, values, collection) {
    let documents = await this.getAllDocument(collection);

    for (let value of values) {
      const eqDocuments = await this.eq(field, value);
      documents = outer(documents, eqDocuments);
    }

    return documents;
  }

  /**
   * Find all document in zset that suitable with the expression
   * @param {Object} expression Expression store condition for field
   * @returns {Array} Documents that matches the expression conditions
   */
  async findByExpression(expression, collection) {
    if (!(expression instanceof Object)) {
      throw new SyntaxError('Compare\'s expression must be an Object');
    }

    // expression { field: <value> }
    let operator = '$eq';
    let value = expression[field];
    const field = Object.keys(expression)[0];

    // expression { field: { operator: <value> } }
    if (value instanceof Object) {
      const fieldValue = expression[field];
      operator = Object.keys(fieldValue)[0];
      value = fieldValue[operator];
    }

    // create function base on operator
    const execCompare = this[operator.slice(1)].bind(this);
    const key = `${collection}.${field}`;
    const score = hashCode(value);

    if (!(execCompare instanceof Function)) {
      throw new Error('Undefined comparison: $' + operator);
    }

    if (operator === '$nin' || operator === '$in') {
      return await execCompare(key, score, collection);
    }

    return await execCompare(key, score);
  }
}

module.exports = Cacher;
