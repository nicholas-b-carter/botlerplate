'use strict';

var _readline = require('readline');

var _readline2 = _interopRequireDefault(_readline);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _requireAll = require('require-all');

var _requireAll2 = _interopRequireDefault(_requireAll);

var _bot = require('./bot');

var _bot2 = _interopRequireDefault(_bot);

var _config = require('../../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var actions = (0, _requireAll2.default)(__dirname + '/../actions');

var recastToken = '';

var rl = _readline2.default.createInterface({
  input: process.stdin,
  output: process.stdout
});

var token = recastToken || _config2.default.recastToken || process.env.TOKEN || process.argv[2];

var bot = new _bot2.default({
  token: token,
  noIntent: _config2.default.noIntentAnsers || { en: ['Aye donte endeurstende'] }
});

bot.registerActions(_lodash2.default.values(actions));

if (process.argv.indexOf('--db') !== -1) {
  bot.useDatabase(_config2.default.database);
}

process.stdin.setEncoding('utf8');

/* eslint no-console: "off" */

var conversId = Math.floor(Math.random() * 1000 + 1).toString();

console.log();
process.stdout.write('> ');

rl.on('SIGINT', function () {
  _mongoose2.default.connection.close();
  rl.close();
});

rl.on('line', function (input) {
  console.log();
  bot.reply(input, conversId).then(function (res) {
    res.forEach(function (r) {
      console.log(r);
      console.log();
    });
    process.stdout.write('> ');
  }).catch(function (err) {
    console.log('Error: ' + err);
    console.log();
    process.stdout.write('> ');
  });
});