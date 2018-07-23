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
        await this.connect()
            .catch((err) => {
                throw err;
            })
        const getList = this.db.listCollections().toArray();
        await getList
            .then((collections) => {
                this.collections = collections;
            })
            .catch((err) => {
                console.log('Error when get database collection:\n' + err.message);
                throw err;
            })
    }

    async getAllDocuments() {
        await this.getCollections()
            .then(() => {
                this.collections.forEach(collection => {
                    console.log(collection.name);
                    const documents = this.db.collection(collection.name).find();
                    documents.forEach(document => {
                        console.log(document);
                    })
                });
            })
            .catch((err) => {
                console.log('Error when get document');
                throw err;
            });
    }
}


// eliminate callback


// const getColl = util.promisify(this.db.listCollections().toArray);
// getColl()
//     .then((collections) => {
//         this.collections = collections;
//         console.log(this.collections);
//         this.collections.forEach(collection => {
//             console.log(collection.name);
//         });
//         return collections;
//     })
//     .catch(() => {
//     })