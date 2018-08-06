import find from './operations/find';
import { isEmpty } from './operations/subFunctions';

export default class Collection {
  constructor(name, mongoClient, redisClient) {
    if (typeof name !== 'string') {
      return new Error('collectionName must be a string');
    }

    if (!mongoClient) {
      return new Error('Invalid mongoClient input');
    }

    if (!redisClient) {
      return new Error('Invalid redisClient input');
    }

    this.name = name || '';
    this.mongoClient = mongoClient;
    this.redisClient = redisClient;
  }

  async find(query, option) {
    return await find(this, query, option);
  }

  async findOne(query = {}, option = {}) {
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