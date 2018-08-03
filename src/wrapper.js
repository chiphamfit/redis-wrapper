import collection from './collection'
import { createError } from './error'

export default class Wrapper {
  constructor(client, dbName) {
    if (!client.mongoClient) {
      throw createError('Wrapper constructor' ,'Invalid input: mongoClient is undefined');
    }
  
    if (!client.redisClient) {
      throw createError('Wrapper constructor', 'Invalid input: redisClient is undefined');
    }

    if (dbName && typeof dbName !== 'string') {
      throw createError('Wrapper constructor', 'Wrong type of dbName: dbName must be string');
    }

    this.client = client || {};
    this.dbName = dbName || '';
  }

  disconnect() {
		if (!this.client.mongo || !this.client.redis) {
			throw this.createError('Invalid client');
		}
	
		if (this.mongo.close) {
			this.mongo.close();
		}
	
		if (this.client.redis.quit) {
			this.client.redis.quit();
		}
	
		return true;
	}

  //none-tested
  createCollection(collectionName) {
    if (typeof collectionName !== 'string') {
      throw new Error('collectionName must be a string');
    }

    this.collection[collectionName] = new collection(collectionName);
  }

  collection(collectionName) {
    if (typeof collectionName !== 'string') {
      throw new Error('collectionName must be a string');
    }

    if (!collection[collectionName]) {
      this.createCollection(collectionName);
    }

    return this.collection[collectionName];
  }

  //useless one don't know what it for yet
  flush() {
    this.redisClient.on('error', (err) => {
      if (err) {
        throw err;
      }
    })
    this.redisClient.flushall();
  }
}