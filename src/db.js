import redis from 'redis';
import mongodb from 'mongodb';
import * as config from '../config';
import {
  insertDocuments
} from './operations/db_operations';

export async function createWrapperClient(mongoClient = {}, redisClient = {}) {
  let _mongoClient = mongoClient || mongodb.connect(config.MONGO_URL, config.parserOption);
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

  // if()
  const mongoDb = mongoClient.db();
  const listCollections = await mongoDb.listCollections().toArray();
  listCollections.forEach(async (collection) => {
    const cursor = await mongoDb.collection(collection.name).find();
    const listDocuments = await cursor.toArray();
    await insertDocuments(redisClient, collection.name, listDocuments);
  });
  return true;
}

export function disconnect(mongoClient, redisClient) {
  if (!mongoClient || !redisClient) {
    throw new Error('Invalid parameter');
  }

  if (mongoClient.close) {
    mongoClient.close();
  }

  if (redisClient.quit) {
    redisClient.quit();
  }

  return true;
}