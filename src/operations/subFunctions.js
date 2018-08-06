export function isEmpty(object) {
  // Check if object is a promise
  if (object.then) {
    return false;
  }

  if (typeof object === 'object' && Object.keys(object).length === 0) {
    return true;
  }
  
  return false;
}

export function numField(object) {
  return Object.keys(object).length;
}