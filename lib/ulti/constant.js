// Constants
const Collection = require('mongodb').Collection;
const RedisClient = require('redis').RedisClient;
const createHash = require('crypto').createHash('md5');

// Default number
const INF = 'inf';
const NEG_INF = '-inf';

const NO_COUNT = 0;
const NO_EXPIRE = 0;
const NO_MATCH = '*';

//  Redis scan constants
const FIRST_CURSOR = '0';
const NEXT_CURSOR_INDEX = 0;
const DATA_INDEX = 1;

// Redis data type
const SET = 'set';
const ZSET = 'zset';
const HASH = 'hash';
const STRING = 'string';

module.exports = {
  Collection,
  RedisClient,
  createHash,
  INF,
  NEG_INF,
  NO_COUNT,
  NO_EXPIRE,
  NO_MATCH,
  FIRST_CURSOR,
  NEXT_CURSOR_INDEX,
  DATA_INDEX,
  SET,
  ZSET,
  HASH,
  STRING
};
