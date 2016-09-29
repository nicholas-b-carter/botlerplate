import _ from 'lodash'

class Bot {
  constructor() {
    this.actions = {}
  }

  registerActions(Actions) {
    if (Array.isArray(Actions)) {
      Actions.forEach(action => { this.registerActions(action) })
    } else {
      const newAction = new Actions()
      if (!newAction.validate()) {
        throw new Error(`Invalid action: ${newAction.name()}`)
      }
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

  // Updates memory with input's entities
  // Priority: 1) constraint of the current action
  //           2) any constraint that is alone in the bot
  updateMemory(conversation, entities, action) {
    const actionKnowledges = action.constraints.reduce((a, b) => a.concat(b))

    _.toPairs(entities).forEach(([name, ents]) => {
      const actionKnowledge = actionKnowledges.find(k => k.entity === name)
      if (actionKnowledge) {
        conversation.memory[actionKnowledge.alias] = ents[0]
      } else {
        const allKnowledges = this.actions.map(a => a.constraints)
                                          .map(csts => csts.reduce((a, b) => a.concat(b)))
                                          .reduce((a, b) => a.concat(b))
        const gblKnowledge = allKnowledges.filter(k => k.entity === name)
        if (gblKnowledge.length === 1) {
          conversation.memory[actionKnowledge.alias] = ents[0]
        }
      }
    })
  }
}

module.exports = Bot
