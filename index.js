import { init } from './src/init';
import  redis from 'redis';

export default class wrapper {
    async init(mongoClient = {}, redisClient = {}) {
        if (typeof mongoClient.then !== 'function') {
            throw new Error(`${JSON.stringify(mongoClient)} is not a MongoClient`);
        }
        if (typeof redisClient.on !== 'function') {
            throw new Error('redisClient is not a redisClient');
        }
        this._mongoClient = await mongoClient.catch((err) => {
            throw err;
        });
        this._redisClient = redisClient;
        this._redisClient.on('error', (err) => {
            throw err;
        });
        return init(this._mongoClient, this._redisClient);
    }
}