import { MongoDb } from './src/mongo';

const mongodb = new MongoDb();
(async () =>{
    await mongodb.connect();
})()
.then(()=>{
    console.log(mongodb.database);
})
