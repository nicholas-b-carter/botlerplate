import test from 'ava'
import Bot from '../src/bot'
import Action from '../src/action'

class Greetings extends Action {
}
class Order extends Action {
  constructor() {
    super()
    this.dependencies = [[{ action: 'Greetings' }]]
  }
}

test('Bot#findActionByName', t => {
  const bot = new Bot()
  bot.registerActions([Greetings, Order])
  t.true(typeof bot.findActionByName('Greetings') === 'object')
  t.true(bot.findActionByName('Greetings').name() === 'Greetings')
  t.true(typeof bot.findActionByName('Order') === 'object')
  t.true(bot.findActionByName('Order').name() === 'Order')
  t.is(bot.findActionByName('Other'), undefined)
})

test('Bot#markActionAsDone', t => {
  const conversation = {
    memory: {},
    conversationData: { states: {} },
    userData: {},
  }
  const bot = new Bot()
  bot.registerActions([Greetings, Order])
  const order = bot.findActionByName('Order')

  // With name
  t.false(conversation.conversationData.states.Greetings === true)
  bot.markActionAsDone('Greetings', conversation)
  t.true(conversation.conversationData.states.Greetings)

  // With instance
  t.false(conversation.conversationData.states.Order === true)
  bot.markActionAsDone(order, conversation)
  t.true(conversation.conversationData.states.Order)
})
