import find from './operations/find';

export default class Collection {
  constructor(name, mongoClient, redisClient) {
    if (typeof name !== 'string') {
      throw new Error('collectionName must be a string');
    }

    if (!mongoClient) {
      throw new Error('Invalid mongoClient input');
    }

    if (!redisClient) {
      throw new Error('Invalid redisClient input');
    }

    this.name = name || '';
    this.mongoClient = mongoClient;
    this.redisClient = redisClient;
  }
 
  async find(query, option) {
    return await find(this, query, option);
  }

  findOne(query = {}, option = {}) {
    return findOne(this, query, option);
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