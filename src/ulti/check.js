function isObject(obj) {
  return obj.constructor === Object;
}

function isNotEmptyObject(obj) {
  return (Object.keys(obj).length === 0 && obj.constructor === Object);
}

function isNotEmptyString(string) {
  if (typeof string !== 'string') {
    return false;
  }

  const _string = string;
  return _string.replace(/\s/g, '') !== '';
}

function isId(id) {
  return (id && id._bsontype === 'ObjectID');
}

module.exports = {
  isNotEmptyObject,
  isNotEmptyString,
  isObject,
  isId
};