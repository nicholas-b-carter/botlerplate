'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Bot = function () {
  function Bot() {
    _classCallCheck(this, Bot);

    this.actions = {};
  }

  _createClass(Bot, [{
    key: 'useDatabase',
    value: function useDatabase(conf) {
      var db = 'mongodb://';
      if (conf.username) {
        db = '' + db + conf.username + ':' + conf.password + '@';
      }
      db = '' + db + conf.hostname + ':' + conf.port + '/' + conf.name + '?ssl=' + conf.ssl;

      _mongoose2.default.connect(db, function (err) {
        if (err) {
          throw err;
        }
      });
    }
  }, {
    key: 'registerActions',
    value: function registerActions(Actions) {
      var _this = this;

      if (Array.isArray(Actions)) {
        Actions.forEach(function (action) {
          _this.registerActions(action);
        });
      } else {
        var newAction = new Actions();
        if (!newAction.validate()) {
          throw new Error('Invalid action: ' + newAction.name());
        }
        this.actions[newAction.name()] = newAction;
      }
    }
  }, {
    key: 'findActionByName',
    value: function findActionByName(name) {
      return this.actions[name];
    }

    // Marks an action as done

  }, {
    key: 'markActionAsDone',
    value: function markActionAsDone(action, conversation) {
      if (typeof action === 'string') {
        conversation.actionStates[action] = true;
      } else {
        conversation.actionStates[action.name()] = true;
      }
    }

    // initialize should resolve the conversation linked to the conversationId
    // The conversation should be found or created in db, or directly instanciated

  }, {
    key: 'initialize',
    value: function initialize(conversationId) {
      return new Promise(function (resolve, reject) {
        // TODO
      });
    }

    // expandVariables takes a string and returns
    // the reply with variables replaced by their respective values

  }, {
    key: 'expandVariables',
    value: function expandVariables(reply, memory) {
      // TODO
    }
  }, {
    key: 'reply',
    value: function reply(input, conversationId) {
      return new Promise(function (resolve, reject) {
        // TODO
      });
    }

    // Updates memory with input's entities
    // Priority: 1) constraint of the current action
    //           2) any constraint that is alone in the bot

  }, {
    key: 'updateMemory',
    value: function updateMemory(action, entities, conversation) {
      var _this2 = this;

      var actionKnowledges = action.constraints.map(function (c) {
        return c.entities;
      }).reduce(function (a, b) {
        return a.concat(b);
      });
      return new Promise(function (resolve, reject) {
        var promises = [];

        // loop through the entities map
        _lodash2.default.toPairs(entities).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2);

          var name = _ref2[0];
          var ents = _ref2[1];

          // search for a constraint of the current action
          var actionKnowledge = actionKnowledges.find(function (k) {
            return k.entity === name;
          });

          ents.forEach(function (entity) {
            if (actionKnowledge) {
              (function () {
                var validator = actionKnowledge.validator || function (e) {
                  return e;
                };

                promises.push(function (n, ent) {
                  return new Promise(function (resolv, rejec) {
                    Promise.resolve(validator(ent, conversation.memory)).then(function (res) {
                      resolv({ name: n, value: res || ent });
                    }).catch(function (err) {
                      rejec(err);
                    });
                  });
                }(actionKnowledge.alias, entity));
              })();
            } else {
              var gblKnowledges = _lodash2.default.values(_this2.actions).map(function (a) {
                return a.constraints;
              }).reduce(function (a, b) {
                return a.concat(b);
              }).map(function (c) {
                return c.entities;
              }).reduce(function (a, b) {
                return a.concat(b);
              }).filter(function (k) {
                return k.entity === name;
              });

              if (gblKnowledges.length === 1) {
                (function () {
                  var validator = gblKnowledges[0].validator || function (e) {
                    return e;
                  };

                  promises.push(function (n, ent) {
                    return new Promise(function (resolv, rejec) {
                      Promise.resolve(validator(ent, conversation.memory)).then(function (res) {
                        resolv({ name: n, value: res || ent });
                      }).catch(function (err) {
                        rejec(err);
                      });
                    });
                  }(gblKnowledges[0].alias, entity));
                })();
              }
            }
          });
        });

        if (promises.length === 0) {
          return resolve();
        }

        var e = [];
        Promise.all(promises.map(function (p) {
          return p.catch(function (err) {
            e.push(err);
          });
        })).then(function (res) {
          res.filter(function (el) {
            return el !== undefined;
          }).forEach(function (entity) {
            var name = entity.name;
            var value = entity.value;

            conversation.memory[name] = value;
          });

          if (e.length > 0) {
            return reject(e[e.length - 1]);
          }

          return resolve();
        });
        return true;
      });
    }
  }, {
    key: 'saveConversation',
    value: function saveConversation(conversation, cb) {
      conversation.markModified('userData');
      conversation.markModified('states');
      conversation.markModified('memory');
      conversation.save(function (err) {
        if (cb) {
          cb(err);
        }
      });
    }
  }]);

  return Bot;
}();

module.exports = Bot;