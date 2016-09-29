class Action {
  constructor() {
    this.constraints = []
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

    if (!Array.isArray(this.dependencies) || !Array.isArray(this.constraints)) {
      return false
    }

    if (!this.dependencies.every(dep => typeof dep.isMissing === 'object' &&
                                        Array.isArray(dep.actions) &&
                                        dep.actions.every(a => typeof a === 'string'))) {
      return false
    }

    if (!this.constraints.every(c => typeof c.isMissing === 'object' &&
                                     Array.isArray(c.entities) &&
                                     c.entities.every(e => typeof e === 'object' &&
                                                           typeof e.entity === 'string' &&
                                                           typeof e.alias === 'string'))) {
      return false
    }

    return true
  }

  dependenciesAreComplete(actions, conversation) {
    return this.dependencies.every(dependency => dependency.actions.some(a => {
      if (a === this.name()) {
        throw new Error(`Action ${a} requires itself`)
      }

      const requiredAction = actions[a]
      if (!requiredAction) {
        throw new Error(`Action ${a} not found`)
      }
      return requiredAction.isDone(actions, conversation)
    }))
  }

  constraintsAreComplete(memory) {
    return this.constraints.every(constraint => constraint.entities.some(e => memory[e.alias]))
  }

  isActionable(actions, conversation) {
    return this.dependenciesAreComplete(actions, conversation)
  }

  isComplete(actions, conversation) {
    return this.dependenciesAreComplete(actions, conversation) &&
      this.constraintsAreComplete(conversation.memory)
  }

  isDone(conversation) {
    return conversation.conversationData.states[this.name()] === true
  }

  getMissingEntity(memory) {
    const incompletes = this.constraints.find(c => c.entities.some(e => memory[e.alias]) === false)
    const randomConstraint = this.getRandom(incompletes)
    return randomConstraint.isMissing
  }

  getMissingDependency(actions, conversation) {
    const incompletes = this.dependencies.find(d => d.actions.map(a => actions[a])
                                                             .every(a => !a.isDone(conversation)))
    return incompletes.isMissing
  }

  process(conversation, actions, recastResponse) {
    return new Promise((resolve, reject) => {
      if (this.isComplete(actions, conversation)) {
        if (this.reply) {
          Promise.resolve(this.reply(conversation, recastResponse))
                 .then(res => resolve(res)).catch(err => reject(err))
        }
        return reject(new Error('No reply found'))
      }
      return resolve(this.getMissingEntity(conversation.memory))
    })
  }
}

module.exports = Action
