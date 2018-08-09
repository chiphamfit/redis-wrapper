import util from 'util';
import {
  isEmpty
} from '../util/check';

// consistance
const DEFAULT_COUNT = 10;
const INF = 'inf';
const NEGATIVE_INF = '-inf';

export async function find(collection, query, option) {
  let selector = query || {};
  // Check special case where we are using an objectId
  if (selector._bsontype === 'ObjectID') {
    selector = {
      _id: selector
    }
    return await findById(selector, collectionName, redisClient);
  }

  // create new option object
  let newOption = Object.assign({}, option);
  newOption.limit = option.limit || 0;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;

  if (isEmpty(selector)) {
    return await findAll(collection.name, collection.redisClient, newOption);
  }

  // create find command for query data
  const findCommand = {
    collection: collection,
    query: selector,
    option: newOption
  }

  return await execFindCommand(findCommand);
}

// Find query = {_id: {$in: [//id array]}} || {_id: ObjectId(4556465aeb1564)}
async function findById(query, collectionName, redisClient) {
  // find documents by scan it id in hash
  const hashGet = util.promisify(redisClient.hget).bind(redisClient);

  if (!query._id) {
    throw new Error('Query not contain _id field');
  }

  const id = `${query._id}`;

  if (typeof id !== 'object') {
    let document = await hashGet(collectionName, id);
    if (document) {
      return [JSON.parse(document)];
    }

    return [];
  }

  // find all id in array
  if (id.$in ) {
    listId = value['$in'];
    listId.forEach(id => {
      // const document = await findById(id, collectionName, redisClient);
      if (document) {
        queryResult.push(document);
      }
    });

    return queryResult;
  }
}

function sortList(list, option) {
  for (let field in option) {
    list = list.sort(predicateBy(field, option[field]));
  }

  return list;
}

export async function findOne(collection, query, option) {
  if (isEmpty(option)) {
    option = {
      limit: 1
    }
  } else {
    option.limit = 1;
  }

  const cursor = await find(collection, query, option);
  return cursor[0] || null;
}

async function findAll(collectionName, redisClient, option) {
  // unpack option
  const limit = option.limit;
  const skip = option.skip;
  const sort = option.sort;
  const count = skip + limit || DEFAULT_COUNT;

  const hashScan = util.promisify(redisClient.hscan).bind(redisClient);
  let nextCursor = 0;
  let cursor = [];

  // scaning documents in collection
  do {
    const scanResult = await hashScan(collectionName, nextCursor, 'COUNT', count);
    nextCursor = scanResult[0];
    const listDocument = scanResult[1];

    for (let i = 1, length = listDocument.length; i < length; i += 2) {
      const document = JSON.parse(listDocument[i]);
      cursor.push(document);
    }

  } while (nextCursor != 0 && (cursor.length < count || limit === 0));

  // apply option to cursor
  if (skip || limit) {
    cursor = cursor.slice(skip, count + skip);
  }

  cursor = sortList(cursor, sort);
  return cursor;
}

async function execFindCommand(findCommand) {
  // unpack findCommand data
  let cursor = [];
  const redisClient = findCommand.collection.redisClient;
  const mongoClient = findCommand.collection.mongoClient;
  const client = {
    redisClient: redisClient,
    mongoClient: mongoClient
  }
  const collectionName = findCommand.collection.name;
  const query = findCommand.query;
  const option = findCommand.option;

  // dianostic the query
  for (let field in query) {
    if (field == '$or') {
      const orArray = query[field];
      orCursor = await findOr(orArray, collectionName, client);
      cursor = cursor.concat(orCursor);
    }

    if (field == '$and') {
      const andArray = query[field];
      const andCursor = await findAnd(andArray, collectionName, client);
      cursor = cursor.concat(andCursor);
    }

    cursor = await findAnd(query, collectionName, client);
  }
  // apply option
  // return
  return [];
}

function findOr(orArray, collectionName, client) {
  let cursor = [];
  orArray.forEach(query => {
    const key = Object.keys(query);
  });
  // if (key !== '$or') {

  // }

  // if (key) {}
  // for (field in query) {
  //   if (field == '$or') {
  //     const orArray = query[field];
  //     orCursor = await findOr(orArray, collectionName, client);
  //     cursor = cursor.push(orCursor);
  //   }

  //   if (field == '$and') {
  //     const andArray = query[field];
  //     const andCursor = await findAnd(andArray, collectionName, client);
  //     cursor = cursor.push(andCursor);
  //   }

  // cursor = await findByQuery(query, collectionName, client);
  // }
  return cursor;
}

function findAnd(andArray, collectionName, client) {

}

// Query must be a single object
export async function findByQuery(query, collectionName, redisClient) {
  const queryResult = [];
  let stack = [];

  // checking
  const queryKeys = Object.keys(query);
  if (queryKeys.length !== 1) {
    throw new Error('SyntaxError: Wrong number of condition in query: ' + JSON.stringify(query));
  }

  let key = queryKeys[0];
  const value = query[key];
  let searchKey = `${collectionName}.${key}`;

  if (key === '_id') {

  }

  if (value.getTime) {
    const key = `${collectionName}.${field}`;
    const time_ms = value.getTime();
    redisClient.zadd(key, time_ms, id);
  }

  // store Timestamp in milisecon in zset
  if (value._bsontype === 'Timestamp') {
    const key = `${collectionName}.${field}`;
    const time_ms = value.toNumber();
    redisClient.zadd(key, time_ms, id);
  }

  // store numberic values to zset
  if (!isNaN(value)) {
    const key = `${collectionName}.${field}`;
    redisClient.zadd(key, value, id);
  }

  // if value of field is object, create field's subObject
  // then insert subObject to index
  if (typeof value === 'object') {
    let subObj = createChild(field, id, value);
    insertIndexs(redisClient, collectionName, subObj);
  }

  // store orther type values in set
  key = `${collectionName}.${field}:${value}`;
  redisClient.sadd(key, id);
}

function predicateBy(property, mode) {
  return (a, b) => {
    if (a[property] > b[property]) {
      return 1 * mode;
    } else if (a[property] < b[property]) {
      return -1 * mode;
    }

    return 0;
  }
}