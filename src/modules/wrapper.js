// Dependensies
import MongoClient from 'mongodb';
import util from 'util';
import redis from 'redis';

const MAX_TIME_LIFE = 60;

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
        await this.connectMongo();
        await this.connectRedis();
        await this.getCollections();
        await this.loadData()
            .then(() => {
                this.find('test');
            })
    }

    async connectMongo() {
        const mongoClient = util.promisify(MongoClient.connect);
        const option = {
            useNewUrlParser: true
        };
        await mongoClient(this.url, option)
            .then((database) => {
                this.db = database.db(this.databaseName);
                console.log('Connected to ' + this.url);
            })
            .catch((err) => {
                console.log('Error when connect to database:\n' + err.message);
                throw err;
            })
    }

    async getCollections() {
        const getListCollection = this.db.listCollections().toArray();
        await getListCollection
            .then((listCollection) => {
                this.collections = listCollection;
            })
            .catch((err) => {
                console.log('Error when get database collection:\n' + err.message);
                throw err;
            })
    }

    async loadData() {
        this.collections.forEach(collection => {
            const listDocuments = this.db.collection(collection.name).find();
            listDocuments.forEach(document => {
                this.set(document);
            })
        })
    }

    async set(document) {
        const value = JSON.stringify(document);
        const id = JSON.stringify(document._id);
        this.redisClient.set(id, value, redis.print)

    }

    connectRedis({
        port = 6379,
        host = 'localhost'
    } = {}) {
        this.redisClient = redis.createClient(port, host);
    }

    find(id) {
        console.log(id);
        this.redisClient.get(id, (err, reply) => {
            if (err) throw err;
            console.log(reply);
        })
    }
}