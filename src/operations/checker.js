import mongodb from 'mongodb';
import redis from 'redis';

export function isEmpty(object) {
  // Check if object is a promise
  if (object.then) {
    return false;
  }

  if (typeof object === 'object' && Object.keys(object).length === 0) {
    return true;
  }

  return false;
}

export async function isMongoClient(client) {
  // clone client
  client = await client;
  return client instanceof mongodb.MongoClient;
}

export async function isRedisClient(client) {
  client = await client;
  return client instanceof redis.RedisClient;
}

export function isValidString(string) {
  if (typeof string === 'string' && string !== '') {
    return true;
  }

  return false;
}

export function isError(error) {
  return error instanceof Error;
}