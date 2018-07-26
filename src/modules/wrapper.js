// Dependensies
import MongoClient from 'mongodb';
import util from 'util';
import redis from 'redis';

const MAX_TIME_LIFE = 60;
const main_storage = 0;
const index_storage = 1;

export class Wrapper {
    constructor({
        host = 'localhost',
        port = 27017,
        databaseName = 'test'
    } = {}) {
        this.url = `mongodb://${host}:${port}/${databaseName}`;
        this.databaseName = databaseName;
        this.documents = [];
    }

    //Function
    setting({
        host = 'localhost',
        port = 27017,
        databaseName = 'test'
    } = {}) {
        this.url = `mongodb://${host}:${port}/${databaseName}`;
        this.databaseName = databaseName;
    }

    async syncData() {
        await this.connectRedis();
        await this.connectMongo();
        await this.getCollections();
        this.importData();
    }

    async connectMongo() {
        const mongoClient = util.promisify(MongoClient.connect);
        const option = {
            useNewUrlParser: true
        };
        await mongoClient(this.url, option)
            .then((database) => {
                this.db = database.db(this.databaseName);
                console.log('Connected to mongodb server: ' + this.url);
            })
            .catch((err) => {
                console.log('Error when connect to mongodb:\n' + err.message);
                throw err;
            })
    }


    async connectRedis() {
        this.redisClient = redis.createClient();
        this.redisClient.on('connect', () => {
            console.log('Connected to redis');
        })
        this.redisClient.on('error', (err) => {
            console.log('Error when connect to redis: ' + err.message);
            throw err;
        })
    }

    async getCollections() {
        await this.db.listCollections().toArray()
            .then((listCollection) => {
                this.collections = listCollection;
            })
            .catch((err) => {
                console.log('Error when get database collection:\n' + err.message);
                throw err;
            })
    }

    async importData() {
        this.collections.forEach(collection => {
            const listDocuments = this.db.collection(collection.name).find();
            listDocuments.forEach(document => {
                this.importDocument(collection.name, document);
                this.importIndex(document);
            })
        })
    }

    importDocument(collection, document) {
        const id = `${document._id}`;
        const value = JSON.stringify(document);
        //insert document index
        this.redisClient.sadd(collection, id);
        this.redisClient.set(id, value)
    }

    importIndex(document) {
        const listField = Object.keys(document);
        listField.forEach(field => {
            const value = JSON.stringify(document[field]);
            //Use set to store index
            this.redisClient.sadd(`${field}:${value}`, `${document._id}`);
        })
    }

    //Query data in redis
    find(object, option) {
        this.redisClient.hgetall(id, (err, reply) => {
            if (err) throw err;
            const json = JSON.parse(JSON.stringify(reply));
            console.log(json);
        })
    }

    //rebuild JSON from string
    rebuildObject(string) {

    }
}