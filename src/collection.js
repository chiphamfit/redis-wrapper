import find from './operations/find';

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

  async findOne(query = {}, option = {
    findOne: true
  }) {
    option.findOne = true;
    return await find(this, query, option);
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