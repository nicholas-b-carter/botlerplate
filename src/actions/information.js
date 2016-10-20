import { Action } from 'bot-dialog-manager'

class Information extends Action {
  constructor() {
    super()
    this.intent = 'information'
    this.notions = [
      {
        entities: [{ entity: 'email', alias: 'email' }],
        isMissing: { en: ['Can I have your email?'] },
      },
      {
        entities: [{ entity: 'person', alias: 'name' }],
        isMissing: { en: ['Could you give me a name?'] },
      },
    ]
    this.dependencies = [
      {
        actions: ['Booking'],
        isMissing: { en: ['I just need to know some basic informations about your booking.'] },
      },
    ]
  }

  reply() {
    return { en: ['Recap of your booking: Room: {{room-number}} date: {{date}}. Do you agree ?'] }
  }
}

module.exports = Information
