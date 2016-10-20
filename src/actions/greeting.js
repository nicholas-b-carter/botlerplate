import { Action } from 'bot-dialog-manager'

class Greetings extends Action {
  constructor() {
    super()
    this.intent = 'greetings'
    this.next = 'Booking'
  }

  reply() {
    return ['Hello ;) I\'m the meeting bot, I can book meeting room for you and your team']
  }
}

module.exports = Greetings
