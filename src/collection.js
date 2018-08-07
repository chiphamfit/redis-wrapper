import find from './operations/find';
import {
  isEmpty,
  isMongoClient,
  isRedisClient
} from './operations/checker';

export default class Collection {
  constructor(name, mongoClient, redisClient) {
    this.name = name || '';
    this.mongoClient = mongoClient;
    this.redisClient = redisClient;
  }

  async find(query, option) {
    if (typeof query !== 'object') {
      throw new TypeError('query must be an object');
    }

    if (typeof option) {
      throw new TypeError('option must be an object');
    }

    return await find(this, query, option);
  }

  async findOne(query = {}, option = {}) {
    if (typeof query !== 'object') {
      throw new TypeError('query must be an object');
    }

    if (typeof option !== 'object') {
      throw new TypeError('option must be an object');
    }

    if (isEmpty(option)) {
      option = {
        limit: 1
      }
    }

    option.limit = 1;
    const cursor = await find(this, query, option);
    if (isEmpty(cursor)) {
      return null;
    }

    return cursor[0];
  }

  update() {

  }

  insert() {

  }

  delete() {

  }

  drop() {

  }

}