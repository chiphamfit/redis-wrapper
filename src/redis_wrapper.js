const redis = require('redis');
const promisifyAll = require('bluebird').promisifyAll;

// add async to all redis's funtion
promisifyAll(redis);

// Constants
const INF = 'inf';
const NEG_INF = '-inf';

const NO_COUNT = 0;
const NO_EXPIRE = 0;
const NO_MATCH = '*';

const FIRST_CURSOR = '0';
const NEXT_CURSOR_INDEX = 0;
const DATA_INDEX = 1;

const SET = 'set';
const ZSET = 'zset';
const HASH = 'hash';
const STRING = 'string';

class RedisWrapper extends redis.RedisClient {
  /**
   * Create a Redis Wrapper client
   * @param {RedisClient} client A redis client
   * @param {Number} expire Time to life of cache data
   */
  constructor(client, expire) {
    super();
    // copy client to this
    if (client instanceof redis.RedisClient) {
      for (let property in client) {
        this[property] = client[property];
      }
    }

    // check if user bypass client
    if (typeof client === 'number' && expire === undefined) {
      expire = client || NO_EXPIRE;
    }

    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive Number');
    }

    this.expire = expire;
  }

  // lazy cache's function
  async searchLazyCache(query_id) {
    let cacheData = [];
    let result = [];
    try {
      cacheData = await this.search(query_id, HASH);
    } catch (error) {
      throw error;
    }

    // if cache hit, parse result back to JSON
    if (cacheData.length > 0) {
      for (let i = 1, length = cacheData.length; i < length; i += 2) {
        result.push(JSON.parse(cacheData[i]));
      }
    }

    return result;
  }

  async saveLazyCache(query_id, result, namespace) {
    // Create query set
    await this.save(namespace, [query_id], SET);

    // create hash to store query result
    let hash = {};
    result.map(document => {
      hash[document._id] = JSON.stringify(document);
    });

    await this.save(query_id, hash, HASH, this.expire);
  }

  /**
   * Search value in redis by key
   * @param {String} key
   * @param {String} type
   * @param {Number} count
   * @param {Number} match
   * @returns {Array} Returns an array of document's id
   */
  async search(key, type = SET, count = NO_COUNT, match = NO_MATCH) {
    if (typeof key !== 'string') {
      throw new TypeError('key name must be a String');
    }

    if (typeof count !== 'number' || count < NO_COUNT) {
      throw new TypeError('count must be an positive number');
    }

    // standardize options
    type = type.toLocaleLowerCase();

    // create scan's query, command
    let scan;
    let result = [];
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;

    if (match !== NO_MATCH) {
      match = JSON.stringify(match);
      query = [...query, 'MATCH', match];
    }

    if (count !== NO_COUNT) {
      query = [...query, 'COUNT', count];
    }

    switch (type) {
    case HASH:
      scan = super.hscanAsync;
      break;
    case SET:
      scan = super.sscanAsync;
      break;
    case ZSET:
      scan = super.zscanAsync;
      break;
    default:
      throw new Error('type is not supported');
    }

    // binding
    scan = scan.bind(this);

    do {
      const scanResult = await scan(query);
      // update query's nextCursor
      nextCursor = scanResult[NEXT_CURSOR_INDEX];
      query[1] = nextCursor;
      // add data to result
      const data = scanResult[DATA_INDEX];
      if (data) {
        result = [...result, ...data];
      }
    } while (
      nextCursor !== FIRST_CURSOR &&
      (result.length < count || count === NO_COUNT)
    );

    return result;
  }

  /**
   * Save data to redis
   * @param {String} key
   * @param {Object} data
   * @param {String} type
   */
  async save(key, data, type = STRING) {
    if (!key) {
      throw new TypeError('key must be a non-empty string');
    }

    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }

    let saveCache = null;
    let parameters = [];
    const newKey = typeof key === 'string' ? key : JSON.stringify(key);

    switch (type) {
    case HASH:
      parameters = [newKey];
      for (let field in data) {
        saveCache = super.hmsetAsync;
        parameters.push(field, data[field]);
      }
      break;
    case ZSET:
      saveCache = super.zaddAsync;
      parameters = [newKey];

      for (let field in data) {
        const score = data[field];
        const member = field;
        parameters.push(score, member);
      }
      break;
    case SET:
      saveCache = super.saddAsync;
      parameters = [newKey, ...data];
      break;
    case STRING:
      saveCache = super.setAsync;
      parameters = [newKey, JSON.stringify(data)];
      break;
    default:
      throw new Error('type not support');
    }

    // bind client
    saveCache = saveCache.bind(this);

    // Execute the saveCache
    try {
      await saveCache(parameters);
    } catch (error) {
      throw error;
    }

    // Set expire time for cache
    if (this.expire !== NO_EXPIRE) {
      super.expire(newKey, this.expire);
    }
  }

  /**
   * Get document by its id
   * @param {string} id
   * @returns {Promise}
   */
  async getDocument(id) {
    const doc = await super.getAsync(id);

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
      const scanResult = await super.sscanAsync(collection, nextCursor);
      // update query's nextCursor
      nextCursor = scanResult[NEXT_CURSOR_INDEX];

      // add document to result
      const arr_id = scanResult[DATA_INDEX];
      if (arr_id) {
        for (let id of arr_id) {
          const document = await super.getAsync(id);
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
    const ids = await super.zrangebyscoreAsync(field, min, max);
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
    const ids = await super.zrangebyscoreAsync(field, min, max);
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
    const ids = await super.zrangebyscoreAsync(field, min, max);
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
    const ids = await super.zrangebyscoreAsync(field, min, max);
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
    const ids = await super.zrangebyscoreAsync(field, min, max);
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
  async ne(field, value) {
    const allDocuments = await this.getAllDocument(this.namespace);
    const eqDocuments = await this.eq(field, value);
    const documents = documentsOuter(allDocuments, eqDocuments);

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
    let documents = await this.getAllDocument(this.namespace);

    for (let value of values) {
      const eqDocuments = await this.eq(field, value);
      documents = documentsOuter(documents, eqDocuments);
    }

    return documents;
  }
}

/**
 * Return documents that in des and src
 * @param {Array} des document's array
 * @param {Array} src document's array
 * @returns {Array} Array of documents
 */
function documentsInter(des, src) {
  const count = [];
  const result = [];

  // Mark all document in src
  for (let document of src) {
    count[document._id] = 1;
  }

  for (let document of des) {
    const id = document._id;

    if (count[id] === 1) {
      result.push(document);
      count[id]++;
    }
  }

  return result;
}

/**
 * Return documents that not in both des and src
 * @param {Array} des document's array
 * @param {Array} src document's array
 * @returns {Array} Array of documents
 */
function documentsOuter(des, src) {
  const count = [];
  const result = [];

  // Mark all document in src
  for (let document of src) {
    count[document._id] = 1;
  }

  // If document not exists in src, add it to result
  for (let document of des) {
    const id = document._id;

    if (!count[id]) {
      result.push(document);
    }
  }

  return result;
}

/**
 * Merge all documents in src to des
 * @param {Array} des document's array
 * @param {Array} src document's arrayy
 * @returns {Array} Array of documents
 */
function documentsUnion(des, src) {
  const documentSet = new Set();
  const result = [];

  for (let document of des) {
    documentSet.add(document);
  }

  for (let document of src) {
    documentSet.add(document);
  }

  documentSet.forEach(document => {
    result.push(document);
  });

  return result;
}

/**
 * Return all documents in des but not in src
 * @param {Array} des document's array
 * @param {Array} src document's array
 * @returns {Array} Array of documents
 */
function documentsNotIn(des, src) {
  const count = [];
  const result = [];

  for (let document of src) {
    const id = document._id;
    count[id] = 1;
  }

  // If document not exist in result add it
  for (let document of des) {
    if (!count[document._id]) {
      result.push(document);
    }
  }

  return result;
}

module.exports = {
  RedisWrapper,
  inter: documentsInter,
  outer: documentsOuter,
  union: documentsUnion,
  notIn: documentsNotIn
};
