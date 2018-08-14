const LAZY_MODE = 'lazy-load';
const FULL_MODE = 'full-load';
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;

function isMongoClient(client) {
  return client instanceof MongoClient;
}

function isRedisClient(client) {
  return client instanceof RedisClient;
}

module.exports = {
  LAZY_MODE,
  FULL_MODE,
  isMongoClient,
  isRedisClient
}