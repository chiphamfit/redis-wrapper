import util from 'util';
import {
  isEmpty,
  isMongoClient,
  isRedisClient
} from './checker';

export default async function find(collection, query, option) {
  if (isEmpty(collection)) {
    throw new Error('collection is empty');
  }

  let selector = query || {};

  // Check special case where we are using an objectId
  if (selector._bsontype === 'ObjectID') {
    selector = {
      _id: selector
    };
  }

  // create new option object
  let newOption = Object.assign({}, option);
  newOption.limit = option.limit || 0;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;

  // create find command for query data
  const findCommand = {
    collectionName: collection.name || '',
    client: collection.redisClient,
    query: selector,
    option: newOption
  }

  return await execFindCommand(findCommand);
}

async function execFindCommand(findCommand) {
  if (isEmpty(findCommand)) {
    throw new Error('findCommand is empty');
  }

  // unpack findCommand data
  const redisClient = findCommand.client;
  const collectionName = findCommand.collectionName || '';
  const query = findCommand.query || {};
  const option = findCommand.option || {};

  if (query._id) {
    const id = [query._id];
    return await findById(id, collectionName, redisClient, option);
  }

  if (isEmpty(query)) {
    return await findAll(collectionName, redisClient, option);
  }
}

async function findAll(collectionName, redisClient, option) {
  // unpack option
  const limit = option.limit;
  const skip = option.skip;
  const sort = option.sort;

  // create 
  const hashScan = util.promisify(redisClient.hscan).bind(redisClient);
  let nextCursor = 0;
  let cursor = [];

  // scaning documents in collection
  do {
    const scanResult = await hashScan(collectionName, nextCursor, 'COUNT', limit || 10);
    nextCursor = scanResult[0];
    const listDocument = scanResult[1];

    for (let i = 1, length = listDocument.length; i < length; i += 2) {
      const document = JSON.parse(listDocument[i]);
      cursor.push(document);
    }
  } while (nextCursor != 0 && (cursor.length < limit + skip || limit === 0));

  // sort here

  // apply option to cursor
  if (skip || limit) {
    cursor = cursor.slice(skip, limit + skip);
  }

  return cursor;
}

// Find document by it _id
async function findById(listId, collectionName, redisClient, option) {
  listId.forEach(id => {
    if (typeof id !== 'string') {
      id = JSON.stringify(id);
    }
  });

  // unpack the option
  const limit = option.limit || 0;
  const sort = option.sort || undefined;
  const skip = option.skip || 0;

  // find documents by scan it id in hash
  let nextCursor = 0;
  let query = [collectionName, nextCursor, 'MATCH', id];

  if (limit > 0) {
    query.push('COUNT', limit);
  }
  const hscan = util.promisify(redisClient.hscan).bind(redisClient);
  const hscanResult = await hscan();
  const cursor = [hscanResult[1][1]] || [];
  if (option.limit >= 0) {
    return cursor.slice(0, option.limit);
  }

  return cursor;
}