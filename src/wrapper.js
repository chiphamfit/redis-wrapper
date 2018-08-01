import { findAll } from './find';

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
        const _query = JSON.stringify(query);
        const _option = JSON.stringify(option);
        const client = this.redisClient;
        const collectionName = this.collectionName;

        if (_query === '{}' && _option === '{}') {
            return await findAll(client, collectionName);
        }
        
        //do some thing here when query or option is passed
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