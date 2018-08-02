export async function init(mongoClient = {}, redisClient = {}) {
    // Check client
    if (redisClient.on) {
        redisClient.on('error', (err) => {
            throw err;
        })
    }
    const has = mongoClient.hasOwnProperty;
    if (!(mongoClient.then || has('db'))) {
        throw new Error('mongoClient must be connected first')
    }

    // Get data from mongodb
    const _mongoClient = await mongoClient.catch((err) => {
        throw err;
    });
    const db = _mongoClient.db();
    const listCollections = await db.listCollections().toArray();
    listCollections.forEach(async (collection) => {
        const listDocuments = await db.collection(collection.name).find().toArray();
        insertDocuments(redisClient, collection.name, listDocuments);
    });
    // console.log('wrapper client initialized');
    const client = {
        mongoClient: _mongoClient,
        redisClient: redisClient
    }
    return client;
}

// insert list of documents to Redis in string
function insertDocuments(redisClient, collection, listDocuments) {
    listDocuments.forEach(async (document) => {
        const key = `${document._id}`;
        await redisClient.set(key, JSON.stringify(document));
        // insert collection index
        insertIndex(redisClient, collection, document);
    })
}

// insert inverted index of doccument into redis
function insertIndex(redisClient, collection, document) {
    const id = `${document._id}`;
    for (let field in document) {
        if (field != '_id') {
            const value = document[field];
            if (typeof (value) === typeof {}) {
                let subObj = createChild(field, id, value);
                insertIndex(redisClient, collection, subObj);
            } else {
                const key = `${collection}:${field}:${value}`;
                redisClient.sadd(key, id);
            }
        }
    }
}

//Create child from object
function createChild(prefix, id, object) {
    const child = {};
    for (let field in object) {
        let _field = `${prefix}:${field}`;
        child[_field] = object[field];
    }
    if (!child._id) {
        child._id = id;
    }
    return child;
}