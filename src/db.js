import redis from 'redis';
import mongodb from 'mongodb';
import * as config from '../config';
import {
  insertDocuments
} from './operations/db_operations';

export async function createWrapperClient(mongoClient = {}, redisClient = {}) {
  let _mongoClient = (mongoClient || mongodb.connect(config.MONGO_URL, config.parserOption));
  const _redisClient = await (redisClient || redis.createClient());
  _redisClient.on('error', (err) => {
    throw err;
  })
  if (_mongoClient.then) {
    _mongoClient = await _mongoClient.catch((err) => {
      throw err;
    })
  }

  return {
    mongo: _mongoClient,
    redis: _redisClient
  }
}

export async function initializeDatabase(mongoClient, redisClient) {
  if (!mongoClient || !redisClient) {
    throw new Error('Invalid parameter');
  }

  const mongoDb = mongoClient.db();
  const listCollections = await mongoDb.listCollections().toArray();
  listCollections.forEach(async (collection) => {
    const listDocuments = await mongoDb.collection(collection.name).find().toArray();
    insertDocuments(redisClient, collection.name, listDocuments);
  });
}

export function disconnect(mongoClient, redisClient) {
  if (!mongoClient || !redisClient) {
    throw new Error('Invalid parameter');
  }

  const mongo_has = mongoClient.hasOwnProperty;
  const redis_has = redisClient.hasOwnProperty;
  if (mongo_has('db')) {
    mongoClient.db().close();
  }

  if (redis_has('quit')) {
    redisClient.quit();
  }
}