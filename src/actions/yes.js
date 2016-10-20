import { Action } from 'bot-dialog-manager'

class Yes extends Action {
  constructor() {
    super()
    this.intent = 'yes'
    this.dependencies = [
      {
        actions: ['Information'],
        isMissing: { en: ['I need you email address and your name before booking the meeting-room.'] },
      },
    ]
    this.endConversation = true
  }

  reply() {
    return { en: ['Great, your room is booked.'] }
  }
}

module.exports = Yes
