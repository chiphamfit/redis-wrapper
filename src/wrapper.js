import {
  find,
  findOne
} from './operations/find';
import {
  initializeDatabase,
  disconnect
} from './db';

export default class wrapper {
  constructor(client) {
    this.client = client;
    this.collectionName = '';
  }

  async init() {
    return await initializeDatabase(this.client.mongo, this.client.redis);
  }

  async exit() {
    return await disconnect(this.client.mongo, this.client.redis)
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