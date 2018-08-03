import {} from './find_operators'
export async function find(wrapper, query, option) {
  if (!wrapper) {
    throw new Error('Missing wrapper client');
  }

  let selector = query || {};

  // Check special case where we are using an objectId
  if (selector._bsontype === 'ObjectID') {
    selector = {
      _id: selector
    };
  } 

  // Ensure the query is an object
  if (selector != null && typeof selector !== 'object') {
    throw new Error('query must be an object');
  }

  const newOption = createNewOption(option);
  const findCommand = {
    collection: wrapper.collectionName || '',
    client: wrapper.client.redis || undefined,
    query: selector,
    option: newOption
  }
  console.log(findCommand);
}

function createNewOption(option) {
  let newOption = Object.assign({}, option);
  newOption.limit = option.limit || 0;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;
  return newOption;
}