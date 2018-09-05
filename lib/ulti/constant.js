// Default number
const INF = 'inf';
const NEG_INF = '-inf';

// Redis scan options
const NO_COUNT = 0;
const NO_EXPIRE = -1;
const NO_MATCH = '*';

// Hash size
const HASH_SIZE = 1000;

// Redis data type
const SET = 'set';
const ZSET = 'zset';
const HASH = 'hash';
const STRING = 'string';

// Fully caching
const LOGICAL = ['$and', '$or', '$nor'];

module.exports = {
  INF,
  NEG_INF,
  NO_COUNT,
  NO_EXPIRE,
  NO_MATCH,
  HASH_SIZE,
  SET,
  ZSET,
  HASH,
  STRING,
  LOGICAL
};

// //  Redis scan result constants
// const FIRST_CURSOR = '0';
// const NEXT_CURSOR_INDEX = 0;
// const DATA_INDEX = 1;
