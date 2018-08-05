import {
  connect,
  initialize
} from './src/operations/wrapperClientOperations';

export default class WrapperClient {
  constructor(mongoClient, redisClient) {
    if (!mongoClient) {
      throw new Error('Invalid input: mongoClient is ' + typeof mongoClient);
    }

    if (!redisClient) {
      throw new Error('Invalid input: redisClient is ' + typeof redisClient);
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
      await this.connect();
    }

    await initialize(this.mongoClient, this.redisClient);
  }

  disconnect() {
    if (!this.mongoClient || !this.redisClient) {
      throw this.wrapperError('Invalid client');
    }

    if (this.mongoClient.close) {
      this.mongoClient.close();
    }

    if (this.redisClient.quit) {
      this.redisClient.quit();
    }

    this.isConnected = false;
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