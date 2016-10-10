import _ from 'lodash'

class Action {
  constructor() {
    this.knowledges = []
    this.dependencies = []
    this.defaultValidator = (entity) => entity
  }

  name() {
    return this.constructor.name
  }

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)]
  }

  validate() {
    if (typeof this.intent !== 'string') {
      return false
    }

    if (!Array.isArray(this.dependencies) || !Array.isArray(this.knowledges)) {
      return false
    }

    if (!this.dependencies.every(dep => typeof dep.isMissing === 'object' &&
                                        Array.isArray(dep.actions) &&
                                        dep.actions.every(a => typeof a === 'string'))) {
      return false
    }

    if (!this.knowledges.every(c => typeof c.isMissing === 'object' &&
                                     Array.isArray(c.entities) &&
                                     c.entities.every(e => typeof e === 'object' &&
                                                           typeof e.entity === 'string' &&
                                                           typeof e.alias === 'string'))) {
      return false
    }
    if (this.dependencies.length > 0 &&
        this.dependencies.some(dependency =>
                               dependency.actions.some(a => a === this.name()))) {
      return false
    }

    return true
  }

  allDependencies() {
    return _.flatten(this.dependencies.map(d => d.actions))
  }

  allKnowledges() {
    return _.flatten(this.knowledges.map(c => c.entities))
  }

  dependenciesAreComplete(actions, conversation) {
    return this.dependencies.every(dependency => dependency.actions.some(a => {
      const requiredAction = actions[a]
      if (!requiredAction) {
        throw new Error(`Action ${a} not found`)
      }
      return requiredAction.isDone(conversation)
    }))
  }

  knowledgesAreComplete(memory) {
    return this.knowledges.every(knowledge => knowledge.entities.some(e => memory[e.alias]))
  }

  isActionable(actions, conversation) {
    return this.dependenciesAreComplete(actions, conversation)
  }

  isComplete(actions, conversation) {
    return this.dependenciesAreComplete(actions, conversation) &&
      this.knowledgesAreComplete(conversation.memory)
  }

  isDone(conversation) {
    return conversation.actionStates[this.name()] === true
  }

  getMissingEntities(memory) {
    return this.knowledges.filter(c => c.entities.some(e => memory[e.alias]) === false)
  }

  getMissingDependencies(actions, conversation) {
    return this.dependencies.filter(d => d.actions.map(a => actions[a])
                                                  .every(a => !a.isDone(conversation)))
  }

  process(conversation, actions, recastResponse) {
    return new Promise((resolve, reject) => {
      if (this.isComplete(actions, conversation)) {
        if (this.reply) {
          return Promise.resolve(this.reply(conversation, recastResponse))
                        .then(resolve).catch(reject)
        }
        return reject(new Error('No reply found'))
      }
      return resolve(this.getRandom(this.getMissingEntities(conversation.memory)).isMissing)
    })
  }
}

module.exports = Action
