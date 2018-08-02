import { init } from './src/db';
import wrapper from './src/wrapper';
import listener from './src/listener';
import redis from 'redis';
import mongodb from 'mongodb';

export async function createClient(mongoClient, redisClient) {
    const parserOption = {
        useNewUrlParser: true
    }
    const _mongoClient = mongoClient || mongodb.connect('mongodb://localhost:27017/test', parserOption);
    const _redisClient = redisClient || redis.createClient();
    const client = await init(_mongoClient, _redisClient);
    //this.listener = listener.create();
    // this.option = option || {};
    return new wrapper(client);
}