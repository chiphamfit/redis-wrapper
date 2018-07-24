import { MongoDb } from './src/modules/mongo';

const mongo = new MongoDb({databaseName: 'demo'});
mongo.syncData();


