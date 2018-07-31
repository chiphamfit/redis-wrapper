// Dependensies
import MongoClient from 'C:/Users/chipham/AppData/Local/Microsoft/TypeScript/2.9/node_modules/@types/mongodb';
import util from 'util';
import redis from 'C:/Users/chipham/AppData/Local/Microsoft/TypeScript/2.9/node_modules/@types/redis';

export default class Wrapper {
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
        await this.getCollections();
        await this.connectRedis();
        await this.importData();
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
            return;
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

    importData() {
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
        let _document = JSON.parse(JSON.stringify(document));
        delete _document._id;
        this.redisClient.set(id, JSON.stringify(_document));
        this.redisClient.sadd(collection, id);

    }

    // Insert inverted index of doccument in redis
    async importIndex(document) {
        const id = `${document._id}`;
        for (let field in document) {
            if (field != '_id') {
                const value = document[field];
                if (typeof (value) === typeof {}) {
                    let subObj = this.createSubObject(field, id, value);
                    this.importIndex(subObj);
                } else {
                    const key = `${field}:${value}`;
                    this.redisClient.sadd(key, id);
                }
            }
        }
    }

    createSubObject(parent, id, document) {
        const subObj = {};
        for (let field in document) {
            let _field = `${parent}:${field}`;
            subObj[_field] = document[field];
        }
        subObj._id = id;
        return subObj;
    }

    //Query data in redis
    async find(collection, query = {}, option = {}) {
        if (JSON.stringify(query) == '{}') {
            return await this.findAll(collection);
        }
    }

    async findAll(collection) {
        let documentList = [];
        const client = this.redisClient;
        const smembers = util.promisify(client.smembers).bind(client);
        const get = util.promisify(client.get).bind(client);
        const idList = await smembers(collection);
        idList.forEach(async (id) => {
            const docString = await get(id);
            const document = Object.assign({
                _id: id
            }, JSON.parse(docString));
            documentList.push(document);
            console.log(document);
        });
        return documentList;
    }

    // rebuild JSON from string
    get(idList) {
        const client = this.redisClient;
        let result = [];
        idList.forEach(async (id) => {
            const docString = await get(id);
            const document = Object.assign({
                _id: id
            }, JSON.parse(docString));
            documentList.push(document);
            console.log(document);
        });
        get(id).then((result) => {
                document = Object.assign({
                    _id: id
                }, JSON.parse(result));
                return document;
            })
            .catch((err) => {
                throw err;
            })
    }
}