import Collection from './collection';
import {
  connectMongoClient,
  connectRedisClient,
  initialize
} from './operations/wrapperClient_ops';
import {
  isMongoClient,
  isRedisClient,
  isValidString
} from './util/check';

export default class WrapperClient {
  constructor(mongoClient, redisClient) {
    if (!isMongoClient(mongoClient)) {
      throw new TypeError('Invalid input: mongoClient must be a mongoClient');
    }

    if (!isRedisClient(redisClient)) {
      throw new TypeError('Invalid input: redisClient must be a redisClient');
    }

    // ensure clients are not undefine
    this.mongoClient = mongoClient || {};
    this.redisClient = redisClient || {};
    this.isConnected = false;
  }

  async connect() {
    if (!isMongoClient(this.mongoClient)) {
      throw new TypeError('Invalid input: mongoClient must be a MongoClient');
    }

    if (!isRedisClient(this.redisClient)) {
      throw new TypeError('Invalid input: redisClient must be a redisClient');
    }

    this.mongoClient = await connectMongoClient(this.mongoClient);
    this.redisClient = await connectRedisClient(this.redisClient);

    this.redisClient.on('error', (error) => {
      throw error;
    });

    this.isConnected = true;
  }

  async initialize() {
    // try to connect
    if (!this.isConnected) {
      await this.connect();
    }

    if (this.isConnected) {
      return await initialize(this.mongoClient, this.redisClient);
    }

    throw new Error('Can\'t connect to client');
  }

  disconnect() {
    if (!isMongoClient(this.mongoClient)) {
      throw new TypeError('Invalid input: mongoClient must be a MongoClient');
    }

    if (!isRedisClient(this.redisClient)) {
      throw new TypeError('Invalid input: redisClient must be a redisClient ');
    }

    if (this.isConnected) {
      this.mongoClient.close();
      this.redisClient.quit();
      this.isConnected = false;
    }
  }

  collection(collectionName) {
    if (!isValidString(collectionName)) {
      throw new Error('collectionName must be a valid string');
    }

    if (!isMongoClient(this.mongoClient)) {
      throw new TypeError('Invalid input: mongoClient must be a MongoClient');
    }

    if (!isRedisClient(this.redisClient)) {
      throw new TypeError('Invalid input: redisClient must be a redisClient ');
    }

    if (!this.isConnected) {
      this.connect();
    }

    return new Collection(collectionName, this.mongoClient, this.redisClient);
  }
}