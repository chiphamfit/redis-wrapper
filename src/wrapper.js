import { init } from './init';
import  redis from 'redis';
import mongodb from 'mongodb';

export default class wrapper {
    constructor (mongoClient, redisClient, option) {
        this.mongoClient = mongoClient || mongodb.mongoClient('mongodb://localhost:27017/test');
        this.redisClient = redisClient || redis.createClient();
        //do something with option like cache query only or wrap database
        this.option = option || {};
        //client status
        this.isConnected = false;
        this.isListening = false;
    }

    async init() {
        return this.isConnected = await init(this.mongoClient, this.redisClient) || false;
    }
    async createListener() {

    }
    async connect() {
        if(!this.isConnected) {
            await this.init();
        }
        if(!this.isListening) {
            await this.createListener();
        }
        return this.isConnected && this.isListening;
    }
    async flush() {
        return await this.redisClient.flushall();
    }
    async exit() {
        if (this.isConnected) {
            await this.flush();
        }
        this.isConnected = false;
    }
    async collections(collectionName) {
        return await this.redisClient.get(collectionName);
    }
    async find() {

    }
    async findOne() {

    }
}