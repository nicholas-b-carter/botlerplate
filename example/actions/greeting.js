
import Action from '../core/action'


class Greetings extends Action {
  constructor() {
    super()
    this.intent = 'greetings'
  }

  reply() {
    return ['Hello ;) I\'m the meeting bot, I can book meeting room for you and your team']
  }
}

module.exports = Greetings
