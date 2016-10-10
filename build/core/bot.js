'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _conversation = require('./conversation');

var _conversation2 = _interopRequireDefault(_conversation);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_mongoose2.default.Promise = global.Promise;

var Bot = function () {
  function Bot(opts) {
    _classCallCheck(this, Bot);

    this.actions = {};
    this.token = opts && opts.token;
    this.language = opts && opts.language;
    this.noIntent = opts && opts.noIntent;
  }

  _createClass(Bot, [{
    key: 'useDatabase',
    value: function useDatabase(conf) {
      this.useDb = true;
      var db = 'mongodb://';
      if (conf.username) {
        db = '' + db + conf.username + ':' + conf.password + '@';
      }
      db = '' + db + conf.hostname + ':' + conf.port + '/' + conf.name;
      if (conf.ssl !== undefined) {
        db = '{db}?ssl=' + conf.ssl;
      }

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
        if (this.actions[newAction.name()]) {
          throw new Error(newAction.name() + ' is already registered');
        }
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
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (!_this2.useDb) {
          return resolve(new _conversation2.default({
            conversationId: conversationId,
            userData: {},
            memory: {},
            actionStates: {}
          }));
        }
        _conversation2.default.findOne({ conversationId: conversationId }).then(function (res) {
          if (res) {
            return resolve(res);
          }
          _conversation2.default.create({
            conversationId: conversationId,
            userData: {},
            memory: {},
            actionStates: {}
          }).then(resolve).catch(reject);
          return true;
        }).catch(function (err) {
          return reject(err);
        });
        return true;
      });
    }

    // expandVariables takes a string and returns
    // the reply with variables replaced by their respective values

  }, {
    key: 'expandVariables',
    value: function expandVariables(reply, memory) {
      var replacer = function replacer(match, v, f) {
        if (!memory[v]) {
          return '';
        }
        var variable = memory[v];
        var field = f || 'raw';
        if (!variable[field]) {
          return '';
        }
        return variable[field];
      };
      return reply.replace(/{{\s*([a-zA-Z0-9\-_]+)\.?([a-zA-Z0-9\-_]+)?\s*}}/g, replacer);
    }
  }, {
    key: 'evaluateReply',
    value: function evaluateReply(reply, memory) {
      if (typeof reply === 'string') {
        return this.expandVariables(reply, memory);
      }

      return reply;
    }
  }, {
    key: 'callToRecast',
    value: function callToRecast(text, token, language) {
      var data = { text: text };
      if (language) {
        data.language = language;
      }
      return (0, _axios2.default)({
        method: 'post',
        headers: { Authorization: 'Token ' + token },
        url: 'https://api.recast.ai/v2/request',
        data: data
      });
    }
  }, {
    key: 'reply',
    value: function reply(input, conversationId, opts) {
      var _this3 = this;

      var tok = opts && opts.token || this.token;
      var language = opts && opts.language || this.language;
      return new Promise(function (resolve, reject) {
        if (!tok) {
          return reject('No token provided');
        }

        _this3.initialize(conversationId).then(function (conversation) {
          if (!conversation.memory) {
            conversation.memory = {};
          }
          if (!conversation.userData) {
            conversation.userData = {};
          }
          if (!conversation.actionStates) {
            conversation.actionStates = {};
          }

          _this3.callToRecast(input, tok, language).then(function (res) {
            var results = res.data.results;
            var act = null;

            if (results.intents.length === 0) {
              act = _this3.searchActionWithoutIntent(conversation, results.entities);
              if (!act && _this3.noIntent) {
                return resolve(_this3.evaluateReply(_this3.pickReplies([_this3.noIntent], results.language)));
              }
              if (!act) {
                return reject('No response when no intent is matched');
              }
            }

            var action = act || _this3.retrieveAction(conversation, results.intents[0].slug);

            if (!action) {
              return reject(new Error('No action found for intent ' + results.intents[0].slug));
            }
            var replies = [];

            var message = null;
            var lastAction = null;
            while (!action.isActionable(_this3.actions, conversation)) {
              var deps = action.getMissingDependencies(_this3.actions, conversation);

              var dep = action.getRandom(deps);
              message = dep.isMissing;
              if (dep.actions.length > 1) {
                lastAction = action.name();
                action = null;
                break;
              }

              action = _this3.actions[dep.actions[0]];
            }

            if (action) {
              lastAction = action.name();
            }
            conversation.lastAction = lastAction;

            if (message) {
              replies.push(message);
            }

            _this3.updateMemory(results.entities, conversation, action).then(function (msg) {
              if (msg) {
                replies.push(msg);
              }

              if (action) {
                action.process(conversation, _this3.actions, results).then(function (resp) {
                  var p = Promise.resolve();
                  if (action.isComplete(_this3.actions, conversation)) {
                    conversation.actionStates[action.name()] = true;
                    if (action.endConversation) {
                      conversation.memory = {};
                      conversation.actionStates = {};
                      conversation.userData = {};
                      conversation.lastAction = null;
                    } else if (action.next) {
                      p = _this3.actions[action.next].process(conversation, _this3.actions, results);
                    }
                  }
                  p.then(function (nextResp) {
                    _this3.saveConversation(conversation, function () {
                      replies.push(resp);
                      if (nextResp) {
                        replies.push(nextResp);
                      }
                      var resps = _this3.pickReplies(replies, results.language);
                      return resolve(resps.map(function (r) {
                        return _this3.evaluateReply(r, conversation.memory);
                      }));
                    });
                  }).catch(function (nextResp) {
                    _this3.saveConversation(conversation, function () {
                      replies.push(nexResp);
                      var resps = _this3.pickReplies(replies, results.language);
                      return resolve(resps.map(function (r) {
                        return _this3.evaluateReply(r, conversation.memory);
                      }));
                    });
                  });
                }).catch(function (resp) {
                  _this3.saveConversation(conversation, function () {
                    replies.push(resp);
                    var resps = _this3.pickReplies(replies, results.language);
                    return resolve(resps.map(function (r) {
                      return _this3.evaluateReply(r, conversation.memory);
                    }));
                  });
                });
              } else {
                _this3.saveConversation(conversation, function () {
                  var resps = _this3.pickReplies(replies, results.language);
                  return resolve(resps.map(function (r) {
                    return _this3.evaluateReply(r, conversation.memory);
                  }));
                });
              }
              return true;
            }).catch(reject);
            return true;
          }).catch(reject);
        }).catch(reject);

        return true;
      });
    }
  }, {
    key: 'pickReplies',
    value: function pickReplies(responses, language) {
      var _this4 = this;

      return responses.map(function (r) {
        if (Array.isArray(r)) {
          return _this4.getRandom(r);
        }

        var resps = r[language];

        if (Array.isArray(resps)) {
          return _this4.getRandom(resps);
        }

        return resps;
      });
    }
  }, {
    key: 'getRandom',
    value: function getRandom(array) {
      return array[Math.floor(Math.random() * array.length)];
    }

    // Updates memory with input's entities
    // Priority: 1) constraint of the current action
    //           2) any constraint that is alone in the bot

  }, {
    key: 'updateMemory',
    value: function updateMemory(entities, conversation, action) {
      var _this5 = this;

      var actionKnowledges = null;
      if (action) {
        actionKnowledges = _lodash2.default.flatten(action.constraints.map(function (c) {
          return c.entities;
        }));
      }
      return new Promise(function (resolve) {
        var promises = [];

        // loop through the entities map
        _lodash2.default.toPairs(entities).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2);

          var name = _ref2[0];
          var ents = _ref2[1];

          // search for a constraint of the current action
          var actionKnowledge = actionKnowledges && actionKnowledges.find(function (k) {
            return k.entity === name;
          }) || null;
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
              var gblKnowledges = _lodash2.default.flatten(_lodash2.default.values(_this5.actions).map(function (a) {
                return a.allConstraints();
              })).filter(function (k) {
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
            return resolve(e[e.length - 1]);
          }

          return resolve();
        });
        return true;
      });
    }
  }, {
    key: 'nextOf',
    value: function nextOf(action) {
      return _lodash2.default.values(this.actions).filter(function (a) {
        return a.allDependencies().indexOf(action.name()) !== -1;
      });
    }
  }, {
    key: 'searchActionWithoutIntent',
    value: function searchActionWithoutIntent(conversation, entities) {
      var last = this.actions[conversation.lastAction];
      if (!last) {
        return null;
      }

      if (this.shouldChooseAction(last, conversation, entities)) {
        return last;
      }

      var nexts = this.nextOf(last);

      if (nexts.length !== 1) {
        return null;
      }

      if (this.shouldChooseAction(nexts[0], conversation, entities)) {
        return nexts[0];
      }

      return null;
    }
  }, {
    key: 'shouldChooseAction',
    value: function shouldChooseAction(action, conversation, entities) {
      var shouldChoose = false;

      _lodash2.default.forOwn(entities, function (values, key) {
        var constraint = action.allConstraints().find(function (c) {
          return c.entity === key;
        });
        if (values.length === 1 && constraint && !conversation.memory[constraint.alias]) {
          shouldChoose = true;
        }
      });
      return shouldChoose;
    }
  }, {
    key: 'retrieveAction',
    value: function retrieveAction(conversation, intent) {
      var _this6 = this;

      var matchingActions = _lodash2.default.values(this.actions).filter(function (a) {
        return a.intent === intent;
      });
      var lastAction = this.actions[conversation.lastAction];
      var action = null;

      if (matchingActions.length === 0) {
        return null;
      } else if (matchingActions.length === 1) {
        return matchingActions[0];
      }

      if (lastAction && matchingActions.length > 1) {
        if (lastAction.isDone(conversation)) {
          action = matchingActions.find(function (a) {
            return _this6.nextOf(lastAction).indexOf(a) !== -1;
          });
        } else {
          action = matchingActions.find(function (a) {
            return a.name() === lastAction.name();
          });
        }
      }

      return action || this.findActionByLevel(conversation, intent) || matchingActions[0];
    }

    /* eslint no-loop-func: "off" */

  }, {
    key: 'findActionByLevel',
    value: function findActionByLevel(conversation, intent) {
      var _this7 = this;

      var requiredActions = new Set(_lodash2.default.flatten(_lodash2.default.values(this.actions).map(function (a) {
        return a.allDependencies();
      })));
      var leafs = _lodash2.default.keys(this.actions).filter(function (a) {
        return !requiredActions.has(a);
      });
      var queue = leafs.map(function (a) {
        return _this7.actions[a];
      });
      var buffer = [];
      var level = 0;

      while (queue.length > 0) {
        queue.filter(function (a) {
          return a.intent === intent;
        }).forEach(function (action) {
          if (!action.isDone(conversation)) {
            buffer.push({ level: level, action: action });
          }
        });

        var sublevel = _lodash2.default.flatten(queue.map(function (a) {
          return a.allDependencies().map(function (ac) {
            return _this7.actions[ac];
          });
        }));

        queue = sublevel;
        level += 1;
      }

      if (buffer.length === 0) {
        return null;
      }

      var sorted = buffer.sort(function (a, b) {
        return a.level - b.level;
      });

      return sorted[sorted.length - 1].action;
    }
  }, {
    key: 'saveConversation',
    value: function saveConversation(conversation, cb) {
      if (this.useDb) {
        conversation.markModified('userData');
        conversation.markModified('actionStates');
        conversation.markModified('memory');
        conversation.markModified('lastAction');
        conversation.save(function (err) {
          if (cb) {
            cb(err);
          }
        });
      } else if (cb) {
        cb();
      }
    }
  }]);

  return Bot;
}();

module.exports = Bot;