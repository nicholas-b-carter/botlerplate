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

  actionIsActionable(action, conversation) {
    return action.dependencies.every(deps => this.dependenciesAreComplete(deps, conversation))
  }

  // Returns true if the action is complete (all the dependencies and constraints are complete)
  actionIsComplete(action, conversation) {
    return action.dependencies.every(deps => this.dependenciesAreComplete(deps, conversation))
      && action.constraints.every(consts => this.constraintsAreComplete(consts, conversation))
  }

  // Returns true if the action is done
  actionIsDone(action, conversation) {
    return this.actionIsComplete(action, conversation) &&
      conversation.conversationData.states[action.name()] === true
  }

  // Marks an action as done
  markActionAsDone(action, conversation) {
    conversation.conversationData.states[action.name()] = true
  }

  // Returns true if a dependency is complete
  // (the associated action is complete)
  dependencyIsComplete(dep, conversation) {
    const action = this.findActionByName(dep.action)
    return this.actionIsDone(action, conversation)
  }

  // Returns true if a group of dependencies is complete
  // (at least one of the dependencies is complete)
  dependenciesAreComplete(dependencies, conversation) {
    return dependencies.some(dep => this.dependencyIsComplete(dep, conversation))
  }

  // Returns true if a constraint is complete
  // (the entity is filled)
  constraintIsComplete(constraint, conversation) {
    if (conversation.memory[constraint.alias]) {
      return true
    }
    return false
  }

  // Returns true if a group of constraint is complete
  // (at least one of the constraints is complete)
  constraintsAreComplete(constraints, conversation) {
    return constraints.some(c => this.constraintIsComplete(c, conversation))
  }
}

module.exports = Bot
