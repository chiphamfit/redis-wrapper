import {
  find,
  findOne
} from './operations/find';
import {
  initializeDatabase
} from './db';

export default class wrapper {
  constructor(client) {
    this.client = client;
    this.collectionName = '';
  }

  init() {
    initializeDatabase(this.client.mongo, this.client.redis);
  }

  async exit() {

  }

  collection(collectionName) {
    this.collectionName = collectionName;
    return this;
  }

  async find(query = {}, option = {}) {
    return find(this, query, option);
  }

  async findOne() {

  }

  //useless one 
  // flush() {
  //   this.redisClient.on('error', (err) => {
  //     if (err) {
  //       throw err;
  //     }
  //   })
  //   this.redisClient.flushall();
  // }
}