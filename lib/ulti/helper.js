const Collection = require('mongodb').Collection;
const RedisClient = require('redis').RedisClient;
const promisifyAll = require('bluebird').promisifyAll;

module.exports = {
  Collection,
  RedisClient,
  promisifyAll,
  isCollection,
  isRedisClient,
  hashCode,
  inter,
  outer,
  union,
  diff
};

// Checking function
function isCollection(collection) {
  if (!collection) {
    return false;
  }

  return collection instanceof Collection;
}

function isRedisClient(redis) {
  if (!redis) {
    return false;
  }

  return redis instanceof RedisClient;
}

/**
 * Convert an unique  32-bit int number
 * for value base on its stringify's charCode
 * @param {string|number|Object} value
 * @returns {number} a 32-bit integer
 */
function hashCode(value) {
  if (value === undefined) {
    return -1;
  }

  let hash = 0;
  const str_value = typeof value !== 'string' ? JSON.stringify(value) : value;

  if (str_value.length === 0) {
    return hash;
  }

  // hash it to number by its charCode
  for (let i in str_value) {
    const char = str_value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert hash to 32-bit int
  }

  return hash;
}

/**
 * Return documents that in des and src
 * @param {Array} des document's array
 * @param {Array} src document's array
 * @returns {Array} Array of documents
 */
function inter(des, src) {
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
function outer(des, src) {
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
function union(des, src) {
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
function diff(des, src) {
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
