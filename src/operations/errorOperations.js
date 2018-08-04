export default function wrapperError(name, message) {
  const _name = name || 'unknown';
  const _message = message || 'undefined message';
  let error = new Error();
  // error.name = _name;
  // error.message = _message;
  return error;
}