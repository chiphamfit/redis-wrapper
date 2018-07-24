// Dependensies
import MongoClient from 'mongodb';
import util from 'util';

export class MongoDb {
    constructor({
        host = 'localhost',
        port = 27017,
        databaseName = 'test'
    } = {}) {
        this.url = `mongodb://${host}:${port}/${databaseName}`;
        this.databaseName = databaseName;
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
        Promise.all([
            await this.connect(),
            await this.getCollections(),
            this.getDocuments()
        ])
        .then(()=>{
            console.log('Load complete');
        })
        .catch(()=>{
            console.log('Failed');
        })
    }

    async connect() {
        const mongoConnect = util.promisify(MongoClient.connect);
        const option = {
            useNewUrlParser: true
        };
        await mongoConnect(this.url, option)
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
        await this.db.listCollections().toArray()
            .then((collections) => {
                this.collections = collections;
            })
            .catch((err) => {
                console.log('Error when get database collection:\n' + err.message);
                throw err;
            })
    }

    async getDocuments() {
        await this.collections.forEach(collection => {
            const documents = this.db.collection(collection.name).find();
            documents.forEach(document => {
                //add to redis here
                console.log(document);
            })
        });
    }
}