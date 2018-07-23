import { MongoDb } from './src/modules/mongo';

const mongodb = new MongoDb({database_name: 'rest_location'});

mongodb.getDatabase()
    .then(() => {
        console.log(mongodb.database);
        // mongodb.load();
    });