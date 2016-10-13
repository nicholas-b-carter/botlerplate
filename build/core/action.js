'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Action = function () {
  function Action() {
    _classCallCheck(this, Action);

    this.notions = [];
    this.dependencies = [];
    this.defaultValidator = function (entity) {
      return entity;
    };
  }

  _createClass(Action, [{
    key: 'name',
    value: function name() {
      return this.constructor.name;
    }
  }, {
    key: 'getRandom',
    value: function getRandom(array) {
      return array[Math.floor(Math.random() * array.length)];
    }
  }, {
    key: 'validate',
    value: function validate() {
      var _this = this;

      if (typeof this.intent !== 'string') {
        return false;
      }

      if (!Array.isArray(this.dependencies) || !Array.isArray(this.notions)) {
        return false;
      }

      if (!this.dependencies.every(function (dep) {
        return _typeof(dep.isMissing) === 'object' && Array.isArray(dep.actions) && dep.actions.every(function (a) {
          return typeof a === 'string';
        });
      })) {
        return false;
      }

      if (!this.notions.every(function (c) {
        return _typeof(c.isMissing) === 'object' && Array.isArray(c.entities) && c.entities.every(function (e) {
          return (typeof e === 'undefined' ? 'undefined' : _typeof(e)) === 'object' && typeof e.entity === 'string' && typeof e.alias === 'string';
        });
      })) {
        return false;
      }
      if (this.dependencies.length > 0 && this.dependencies.some(function (dependency) {
        return dependency.actions.some(function (a) {
          return a === _this.name();
        });
      })) {
        return false;
      }

      return true;
    }
  }, {
    key: 'allDependencies',
    value: function allDependencies() {
      return _lodash2.default.flatten(this.dependencies.map(function (d) {
        return d.actions;
      }));
    }
  }, {
    key: 'allNotions',
    value: function allNotions() {
      return _lodash2.default.flatten(this.notions.map(function (c) {
        return c.entities;
      }));
    }
  }, {
    key: 'dependenciesAreComplete',
    value: function dependenciesAreComplete(actions, conversation) {
      return this.dependencies.every(function (dependency) {
        return dependency.actions.some(function (a) {
          var requiredAction = actions[a];
          if (!requiredAction) {
            throw new Error('Action ' + a + ' not found');
          }
          return requiredAction.isDone(conversation);
        });
      });
    }
  }, {
    key: 'notionsAreComplete',
    value: function notionsAreComplete(memory) {
      return this.notions.every(function (notion) {
        return notion.entities.some(function (e) {
          return memory[e.alias];
        });
      });
    }
  }, {
    key: 'isActionable',
    value: function isActionable(actions, conversation) {
      return this.dependenciesAreComplete(actions, conversation);
    }
  }, {
    key: 'isComplete',
    value: function isComplete(actions, conversation) {
      return this.dependenciesAreComplete(actions, conversation) && this.notionsAreComplete(conversation.memory);
    }
  }, {
    key: 'isDone',
    value: function isDone(conversation) {
      return conversation.actionStates[this.name()] === true;
    }
  }, {
    key: 'getMissingEntities',
    value: function getMissingEntities(memory) {
      return this.notions.filter(function (c) {
        return c.entities.some(function (e) {
          return memory[e.alias];
        }) === false;
      });
    }
  }, {
    key: 'getMissingDependencies',
    value: function getMissingDependencies(actions, conversation) {
      return this.dependencies.filter(function (d) {
        return d.actions.map(function (a) {
          return actions[a];
        }).every(function (a) {
          return !a.isDone(conversation);
        });
      });
    }
  }, {
    key: 'process',
    value: function process(conversation, actions, recastResponse) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (_this2.isComplete(actions, conversation)) {
          if (_this2.reply) {
            return Promise.resolve(_this2.reply(conversation, recastResponse)).then(resolve).catch(reject);
          }
          return reject(new Error('No reply found'));
        }
        return resolve(_this2.getRandom(_this2.getMissingEntities(conversation.memory)).isMissing);
      });
    }
  }]);

  return Action;
}();

module.exports = Action;
