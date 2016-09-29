class Action {
  constructor() {
    this.constraints = []
    this.dependencies = []
    this.defaultValidator = () => Promise.resolve()
  }

  name() {
    return this.constructor.name
  }

  dependenciesAreComplete(actions, conversation) {
    this.dependencies.every(prerequisites => prerequisites.some(p => {
      const requiredAction = actions.find(a => a.name() === p.action)
      return requiredAction.isDone(actions, conversation)
    }))
  }

  constraintsAreComplete(conversation) {
    return this.constraints.every(knowledges => knowledges.some(k => conversation.memory[k.alias]))
  }

  isActionable(actions, conversation) {
    return this.dependenciesAreComplete(actions, conversation)
  }

  isComplete(actions, conversation) {
    return this.dependenciesAreComplete(actions, conversation) &&
      this.constraintsAreComplete(conversation)
  }

  isDone(conversation) {
    return conversation.conversationData.states[this.name()] === true
  }
}

module.exports = Action
