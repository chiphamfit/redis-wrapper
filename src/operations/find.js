import util from 'util';
import {
  isEmpty,
  numField
} from './checker';
// import Collection from '../collection';

export default async function find(collection, query, option) {
  if (isEmpty(collection)) {
    return new Error('collection is empty');
  }

  let selector = query || {};
  const newOption = createNewOption(option);

  // Check special case where we are using an objectId
  if (selector._bsontype === 'ObjectID') {
    selector = {
      _id: selector
    };
  }

  const findCommand = {
    collection: collection.name || '',
    client: collection.redisClient,
    query: selector,
    option: newOption
  }

  return await execFindCommand(findCommand);
}

function createNewOption(option) {
  let newOption = Object.assign({}, option);
  newOption.limit = option.limit || -1;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;
  return newOption;
}

async function execFindCommand(findCommand) {
  if (isEmpty(findCommand)) {
    return new Error('findCommand is empty');
  }

  // unpack findCommand data
  const redisClient = findCommand.client;
  const collectionName = findCommand.collection || '';
  const query = findCommand.query || {};
  const option = findCommand.option || {};
  const numberQuery = Object.keys(query).length;

  if (query._id && numberQuery === 1) {
    const id = query._id;
    return await findById(id, collectionName, redisClient, option);
  }

  if (isEmpty(query)) {
    return await findAll(collectionName, redisClient, option);
  }
}

async function findAll(collectionName, redisClient, option) {
  let nextCursor = 0;
  let cursor = [];
  const hscan = util.promisify(redisClient.hscan).bind(redisClient);
  do {
    const scanResult = await hscan(collectionName, nextCursor);
    nextCursor = scanResult[0];
    const listRaw = scanResult[1];
    for (let i = 1, length = listRaw.length; i < length; i += 2) {
      cursor.push(listRaw[i]);
    }
  } while (nextCursor != 0);
  
  if (option.limit >= 0) {
    return cursor.slice(0, option.limit);
  }

  return cursor;
}

// Find document by it _id
async function findById(id, collectionName, redisClient, option) {
  id = `${id}`;
  if ( typeof id !== 'string') {
    return new Error('id must be a string');
  }
  
  const hscan = util.promisify(redisClient.hscan).bind(redisClient);
  const hscanResult = await hscan(collectionName, 0, 'MATCH', id);
  const cursor =  [hscanResult[1][1]] || [];
  if (option.limit >= 0) {
    return cursor.slice(0, option.limit);
  }

  return cursor;
}
