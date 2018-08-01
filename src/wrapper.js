import { findAll } from './find';

export default class wrapper {
    constructor(client) {
        this.redisClient = client.redisClient;
        this.mongoClient = client.mongoClient;
        this.collectionName = '';
    }
    
    flush() {
        this.redisClient.on('error', (err) => {
            if (err) {
                throw err;
            }
        })
        this.redisClient.flushall();
        // console.log('redis database cleaned');
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
        console.log();
        if (_query === '{}' && _option === '{}') {
            const result = await findAll(client, collectionName);
        }
    }

    async findOne() {

    }
}