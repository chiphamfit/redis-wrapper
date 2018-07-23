// Dependensies
import MongoClient from 'mongodb';
import util from 'util';

const default_url = 'mongodb://localhost:';

export class MongoDb {
    constructor({
        url = default_url,
        port = 27017,
        database_name = 'test'
    } = {}) {
        this.database_name = database_name;
        this.url = url + port + '/';
        console.log(this.url);
    }
    async connect() {
        const connect = util.promisify(MongoClient.connect);
        return connect(this.url, {
            useNewUrlParser: true
        });
    }
    async getDatabase() {
        await this.connect()
            .then((database) => {
                this.database = database.db(this.database_name);
                console.log('Connected to database ' + this.database_name);
            }).catch((err) => {
                console.log(err.message);
            });
    }
    // Load all collection on database to redis
    async load() {
        if (this.database === {}) {
            console.log('Reconnect to ' + this.url);
            this.connect();
        }
        await MongoClient.connect(this.url, {
            useNewUrlParser: true
        }, function (err, client) {
            client.db.listCollections().toArray(function (err, collections) {});
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