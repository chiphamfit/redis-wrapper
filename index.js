import {
  connect,
  initialize
} from './src/operations/WrapperClient';
import Collection from './src/collection';

export default class WrapperClient {
  constructor(mongoClient, redisClient) {
    if (!mongoClient) {
      return new Error('Invalid input: mongoClient is ' + typeof mongoClient);
    }

    if (!redisClient) {
      return new Error('Invalid input: redisClient is ' + typeof redisClient);
    }

    this.mongoClient = mongoClient || {};
    this.redisClient = redisClient || {};
    this.isConnected = false;
  }

  async connect() {
    this.isConnected = await connect(this.mongoClient, this.redisClient) || false;
  }

  async initialize() {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        return error
      }
    }

    await initialize(this.mongoClient, this.redisClient);
  }

  disconnect() {
    if (!this.mongoClient || !this.redisClient) {
      return this.wrapperError('Invalid client');
    }

    if (this.mongoClient.close) {
      this.mongoClient.close();
    }

    if (this.redisClient.quit) {
      this.redisClient.quit();
    }

    this.isConnected = false;
  }

  collection(collectionName) {
    if (typeof collectionName !== 'string') {
      return new Error('collectionName must be string');
    }

    return new Collection(collectionName, this.mongoClient, this.redisClient);
  }

  // clear database
  flush() {
    this.redisClient.on('error', (err) => {
      if (err) {
        return err;
      }
    })
    this.redisClient.flushall();
  }
}