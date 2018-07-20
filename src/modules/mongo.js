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
        this.database_name = database_name;
        this.url = (url || default_url) + database_name;
        this.listCollection = [];
        this.database = {};
    }
    async connect() {
        const connect = util.promisify(MongoClient.connect);
        return connect(this.url, {
            useNewUrlParser: true
        });
    }
    async getDatabase() {
        // const tam = await this.connect();
        await this.connect()
            .then((database) => {
                this.database = database;
                console.log('Connected to database ' + this.url);
            }).catch((err) => {
                console.log(err.message);
            });
    }
    // Load all collection on database to redis
    async load() {
        let abc;
        if (this.database === {}) {
            console.log('Reconnect to ' + this.url);
            this.connect();
        }
        await MongoClient.connect(this.url , {
            useNewUrlParser: true
        }, function (err, client) {
            client.db.listCollections().toArray(function(err, collections){
                //collections = [{"name": "coll1"}, {"name": "coll2"}]
            });
        });
        // console.log(abc);
        // if(abc===this.database.db()){
        //     console.log('sameee');
        // } else {
        //     console.log('damnnn');
        // }

        //const collectionList = this.database.listCollection();
        // db.listCollection();

    }
}

// MongoClient.connect(this.url, (err, db) => {
//     if (err) {
//         console.log('Error when connect to database ' + this.url);
//         console.log(err);
//     };

//     console.log('Use database ' + this.url);
// });