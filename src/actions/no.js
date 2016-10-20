import { Action } from 'bot-dialog-manager'

class No extends Action {
  constructor() {
    super()
    this.intent = 'no'
    this.dependencies = [
      {
        actions: ['Information'],
        isMissing: { en: ['I need you email address and your name before booking the meeting-room.'] },
      },
    ]
    this.endConversation = true
  }

  reply() {
    return { en: ['When would you like to reschedule the room booking ?'] }
  }
}

module.exports = No
