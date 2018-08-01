export async function init(mongoClient = {}, redisClient = {}) {
    // Check client
    if (redisClient.on) {
        redisClient.on('error', (err) => {
            throw err;
        })
    }
    if (!(mongoClient.then || mongoClient.db)) {
        throw new Error('mongoClient must be connected first')
    }

    // Get data from mongodb
    const _mongoClient = await mongoClient.catch((err) => {
        throw err;
    });
    const db = _mongoClient.db();
    const listCollections = await db.listCollections().toArray();
    listCollections.forEach(async (collection) => {
        const listDocuments = await db.collection(collection.name).find();
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
    listDocuments.forEach((document) => {
        redisClient.set(`${document._id}`, JSON.stringify(document));
        // update collection index
        redisClient.sadd(collection, `${document._id}`);
        insertIndex(redisClient, document);
    })
}

// insert inverted index of doccument into redis
function insertIndex(redisClient, document) {
    const id = `${document._id}`;
    for (let field in document) {
        if (field != '_id') {
            const value = document[field];
            if (typeof (value) === typeof {}) {
                let subObj = createSubObject(field, id, value);
                insertIndex(redisClient, subObj);
            } else {
                const key = `${field}:${value}`;
                redisClient.sadd(key, id);
            }
        }
    }
}

//Create document from subObject of Document
function createSubObject(parent, id, document) {
    const subObj = {};
    for (let field in document) {
        let _field = `${parent}:${field}`;
        subObj[_field] = document[field];
    }
    subObj._id = id;
    return subObj;
}