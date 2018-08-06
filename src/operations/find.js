import util from 'util';
import {
  isEmpty,
  numField
} from './subFunctions';
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
  newOption.limit = option.limit || 0;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;
  newOption.findOne = option.findOne || false;
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

  if (query._id && numField(query) === 1) {
    const id = query._id;
    return await findById(id, collectionName, redisClient, option);
  }

  if (isEmpty(query)) {
    return await findAll(collectionName, redisClient, option);
  }
}

async function findAll(collectionName, redisClient, option) {
  let condition = [collectionName, 0];
  if (option.findOne) {
    condition.push('COUNT', 1);
  }
  const hscan = util.promisify(redisClient.hscan).bind(redisClient);
  const hscanResult = await hscan(condition);
  const nextCursor = hscanResult[0] || 0;
  const cursor = [];
  const listRawDocument = hscanResult[1] || [];
  for (let i = 1, length = listRawDocument.length; i < length; i += 2) {
    cursor.push(listRawDocument[i]);
  }
  return cursor;
}

// Find document by it _id
async function findById(id, collectionName, redisClient, option) {
  id = `${id}`;
  if ( typeof id !== 'string') {
    return new Error('id must be a string');
  }
  
  let condition = [collectionName, 0, 'MATCH', id];
  if (option.findOne) {
    condition.push('COUNT', 1);
  }

  const hscan = util.promisify(redisClient.hscan).bind(redisClient);
  const hscanResult = await hscan(condition);
  const nextCursor = hscanResult[0] || 0;
  const cursor = [];
  const listRawDocument = hscanResult[1] || [];
  for (let i = 1, length = listRawDocument.length; i < length; i += 2) {
    cursor.push(listRawDocument[i]);
  }
  return cursor;
}
