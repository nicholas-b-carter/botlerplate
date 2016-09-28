class Action {
  constructor() {
    this.constraints = []
    this.dependencies = []
    this.defaultUpdator = () => Promise.resolve()
  }

  name() {
    return this.constructor.name
  }
}

module.exports = Action
