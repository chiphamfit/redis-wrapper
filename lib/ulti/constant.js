// Default number
const INF = 'inf';
const NEG_INF = '-inf';

// Redis scan options
const NO_COUNT = 0;
const NO_EXPIRE = -1;
const DEF_EXPIRE = 120;
const NO_MATCH = '*';

//  Redis scan result constants
const FIRST_CURSOR = '0';
const NEXT_CURSOR_INDEX = 0;
const DATA_INDEX = 1;
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
  DEF_EXPIRE,
  NO_MATCH,
  FIRST_CURSOR,
  NEXT_CURSOR_INDEX,
  DATA_INDEX,
  SET,
  ZSET,
  HASH,
  STRING,
  LOGICAL,
  HASH_SIZE
};
