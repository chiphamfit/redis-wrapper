import {
  find,
  findOne
} from './operations/collection_ops';
import {
  isEmpty,
  isMongoClient,
  isRedisClient
} from './util/check';

export default class Collection {
  constructor(name, mongoClient, redisClient) {
    this.name = name || '';
    this.mongoClient = mongoClient;
    this.redisClient = redisClient;
  }

  async find(query, option) {
    query = query === undefined ? {} : query;
    option = option === undefined ? {} : option;
    
    if (typeof query !== 'object') {
      throw new TypeError('query must be an object');
    }

    if (typeof option !== 'object') {
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

    return await findOne(this, query, option);
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