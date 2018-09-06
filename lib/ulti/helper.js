const Collection = require('mongodb').Collection;
const RedisClient = require('redis').RedisClient;
const promisifyAll = require('bluebird').promisifyAll;

// Checking function
function isCollection(collection) {
  return collection && collection instanceof Collection;
}

function isRedisClient(redis) {
  return redis && redis instanceof RedisClient;
}

function isNotObject(object) {
  return object && !(object instanceof Object);
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

  if (typeof value === 'number') {
    return value;
  }

  const str_value = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 0;

  if (str_value.length === 0) {
    return hash;
  }

  // hash it to number by its charCode
  for (let i = 0, length = str_value.length; i < length; i++) {
    const char = str_value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  // always return negative interger for string
  // convert hash to negative int
  hash = Number.MAX_SAFE_INTEGER - hash;

  return -hash;
}

function hexToInt(hex) {
  const safe_length = 12;
  let str_hex = typeof hex === 'string' ? hex : JSON.stringify(hex);

  if (str_hex.length < safe_length) {
    return parseInt(str_hex);
  }

  // Get last chars of hex, convert it to int
  str_hex = str_hex.slice(str_hex.length - safe_length, -1);
  return parseInt(str_hex, 16);
}
/**
 * Return documents that in a and b
 * @returns {Array} Array of documents
 */
function inter(arr_array) {
  const arr_n = arr_array.length;
  const result = [];
  const count = [];

  for (let arr of arr_array) {
    for (let document of arr) {
      const id = document._id;

      // if document in all array
      if (!count[id]) {
        count[id] = 1;
      } else {
        count[id] = count[id] + 1;

        if (count[id] === arr_n) {
          result.push(document);
        }
      }
    }
  }

  return result;
}

/**
 * Return documents that not in both a and b
 * @param {Array} a document's array
 * @param {Array} b document's array
 * @returns {Array} Array of documents
 */
function outer(a, b) {
  const count = [];
  const result = [];

  // Mark all document in b
  for (let document of b) {
    count[document._id] = 1;
  }

  // If document not exists in b, add it to result
  for (let document of a) {
    const id = document._id;

    if (!count[id]) {
      result.push(document);
    }
  }

  return result;
}

/**
 * Merge all documents in b to a
 * @param {Array} a document's array
 * @param {Array} b document's arrayy
 * @returns {Array} Array of documents
 */
function union(arr_array) {
  const result = [];
  const set = new Set();

  for (let arr of arr_array) {
    for (let document of arr) {
      set.add(JSON.stringify(document));
    }
  }

  set.forEach(document => {
    result.push(JSON.parse(document));
  });

  return result;
}

/**
 * Return all documents in a and not in b
 * @param {Array} a document's array
 * @param {Array} b document's array
 * @returns {Array} Array of documents
 */
function diff(a, b) {
  const count = [];
  const result = [];

  for (let document of b) {
    const id = document._id;
    count[id] = 1;
  }

  // If document not exist in result add it
  for (let document of a) {
    if (!count[document._id]) {
      result.push(document);
    }
  }

  return result;
}

module.exports = {
  isCollection,
  isRedisClient,
  isNotObject,
  RedisClient,
  promisifyAll,
  hashCode,
  hexToInt,
  inter,
  outer,
  union,
  diff
};
