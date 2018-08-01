# redis-wrapper

Wrap mongo database with redis

## Dependencies

This module require these packages redis, mongodb, babel, util.

```npm install util redis mongodb nodemon --save```
```npm install babel-cli babel-preset-env --save-dev```

Add these to `package.json` file

 ```javascript
"scripts": {
    "start": "nodemon --exec babel-node --presets env index.js"
  },
"presets":
    ["env"]
```
