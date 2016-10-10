'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Action = function () {
  function Action() {
    _classCallCheck(this, Action);

    this.constraints = [];
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

      if (!Array.isArray(this.dependencies) || !Array.isArray(this.constraints)) {
        return false;
      }

      if (!this.dependencies.every(function (dep) {
        return _typeof(dep.isMissing) === 'object' && Array.isArray(dep.actions) && dep.actions.every(function (a) {
          return typeof a === 'string';
        });
      })) {
        return false;
      }

      if (!this.constraints.every(function (c) {
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
    key: 'constraintsAreComplete',
    value: function constraintsAreComplete(memory) {
      return this.constraints.every(function (constraint) {
        return constraint.entities.some(function (e) {
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
      return this.dependenciesAreComplete(actions, conversation) && this.constraintsAreComplete(conversation.memory);
    }
  }, {
    key: 'isDone',
    value: function isDone(conversation) {
      return conversation.actionStates[this.name()] === true;
    }
  }, {
    key: 'getMissingEntities',
    value: function getMissingEntities(memory) {
      return this.constraints.find(function (c) {
        return c.entities.some(function (e) {
          return memory[e.alias];
        }) === false;
      });
    }
  }, {
    key: 'getMissingDependencies',
    value: function getMissingDependencies(actions, conversation) {
      return this.dependencies.find(function (d) {
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
            Promise.resolve(_this2.reply(conversation, recastResponse)).then(function (res) {
              return resolve(res);
            }).catch(function (err) {
              return reject(err);
            });
          }
          return reject(new Error('No reply found'));
        }
        return resolve(_this2.getMissingEntity(conversation.memory));
      });
    }
  }]);

  return Action;
}();

module.exports = Action;