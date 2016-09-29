class Bot {
  constructor() {
    this.actions = {}
  }

  registerActions(Actions) {
    if (Array.isArray(Actions)) {
      Actions.forEach(action => { this.registerActions(action) })
    } else {
      const newAction = new Actions()
      this.actions[newAction.name()] = newAction
    }
  }

  findActionByName(name) {
    return this.actions[name]
  }

  // Marks an action as done
  markActionAsDone(action, conversation) {
    if (typeof action === 'string') {
      conversation.conversationData.states[action] = true
    } else {
      conversation.conversationData.states[action.name()] = true
    }
  }
}

module.exports = Bot
