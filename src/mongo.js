//Dependensies
import MongoClient from 'mongodb';
import util from 'util';
import {
    resolve
} from 'url';
import {
    rejects
} from 'assert';

const default_url = 'mongodb://localhost:27017/';

export class MongoDb {
    constructor(database_name = 'test', url = default_url) {
        this.url = (url || default_url) + database_name;
        this.listCollection = [];
        this.database = {};
    }
    // Return promise(database, err)
    connect() {
        (async () => {
            const getDatabase = util.promisify(MongoClient.connect);
            await getDatabase(this.url, {
                useNewUrlParser: true
            })
        })()
        .then((database) => {
            console.log('Connected to database ' + this.url);
            this.database = database;
        }).catch((err) => {
            console.log(err.message);
        });
    }
    // Load all collection on database to redis
    async load() {
        await this.connect()
            .then((db) => {
                db.listCollections().toArray(function (err, collInfos) {});
            });
    }
}

// MongoClient.connect(this.url, (err, db) => {
//     if (err) {
//         console.log('Error when connect to database ' + this.url);
//         console.log(err);
//     };

//     console.log('Use database ' + this.url);
// });