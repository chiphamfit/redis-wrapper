import { find } from './find';

export default class wrapper {
    constructor(client) {
        this.redisClient = client.redisClient;
        this.mongoClient = client.mongoClient;
        this.collectionName = '';
    }
  

    async exit() {
        if (this.isConnected) {
        }
        this.isConnected = false;
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
    flush() {
        this.redisClient.on('error', (err) => {
            if (err) {
                throw err;
            }
        })
        this.redisClient.flushall();
    }
}