
import Action from '../core/action'


class Yes extends Action {
  constructor() {
    super()
    this.intent = 'agree'
    this.dependencies = [
      {
        actions: ['Booking'],
        isMissing: { en: ['Please tell me what do you need.'] },
      }
    ]
    this.endConversation = true
  }

  reply() {
    return { en: ['Great, your room is booked.'] }
  }
}

module.exports = Yes
