import mongodb from 'mongodb';
import redis from 'redis';

export function isEmpty(object) {
  // Check if object is a promise
  if (object instanceof Promise) {
    return false;
  }

  if (Object.keys(object).length > 0) {
    return false;
  }

  return true;
}

export async function isMongoClient(client) {
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