export default class wrapper {
    constructor(client) {
        this.redisClient = client.redisClient;
        this.mongoClient = client.mongoClient
    }
    
    flush() {
        this.redisClient.on('error', (err) => {
            if (err) {
                throw err;
            }
        })
        this.redisClient.flushall();
        // console.log('redis database cleaned');
    }

    async exit() {
        if (this.isConnected) {
        }
        this.isConnected = false;
    }

    //get all collection's name of database
    collections() {
        const collections = this.mongoClient.db().listCollections().toArray();
        console.log(collections);
    }

    async find() {

    }
    
    async findOne() {

    }
}