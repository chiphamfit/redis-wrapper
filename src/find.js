import util from 'util';

//Query data in redis
export async function findAll(client, collectionName) {
    let listDocument = [];
    const smembers = util.promisify(client.smembers).bind(client);
    const get = util.promisify(client.get).bind(client);
    const listKey = await smembers(collectionName);
    for (let key of listKey) {
        const stringDocument = await get(key);
        // error when parse nested JSON       
        const document = JSON.parse(stringDocument);
        listDocument.push(document);
    }
    return listDocument;
}

// rebuild JSON from string
async function get(idList) {
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