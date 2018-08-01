import redis from 'redis';

//Query data in redis
export async function find(collection, query = {}, option = {}) {
    if (JSON.stringify(query) == '{}' ) {
        return await findAll(client, collection, option);
    }
}

async function findAll(client, collection, option) {
    let documentList = [];
    const smembers = util.promisify(client.smembers).bind(client);
    const get = util.promisify(client.get).bind(client);
    const idList = await smembers(collection);
    idList.forEach(async (id) => {
        const docString = await get(id);
        const document = Object.assign({
            _id: id
        }, JSON.parse(docString));
        documentList.push(document);
        console.log(document);
    });
    return documentList;
}

// rebuild JSON from string
function get(idList) {
    const client = this.redisClient;
    let result = [];
    idList.forEach(async (id) => {
        const docString = await get(id);
        const document = Object.assign({
            _id: id
        }, JSON.parse(docString));
        documentList.push(document);
        console.log(document);
    });
    get(id).then((result) => {
            document = Object.assign({
                _id: id
            }, JSON.parse(result));
            return document;
        })
        .catch((err) => {
            throw err;
        })
}