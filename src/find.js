import util from 'util';

//Query data in redis
export async function findAll(client, collectionName) {
    let documentList = [];
    const smembers = util.promisify(client.smembers).bind(client);
    const get = util.promisify(client.get).bind(client);
    const idList = await smembers(collectionName);
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