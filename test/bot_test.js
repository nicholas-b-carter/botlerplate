import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon';
import mongoose from 'mongoose'

import Bot from '../src/bot'
import Action from '../src/action'

class Greetings extends Action {
  constructor() {
    super()
    this.intent = 'greetings'
  }
}
class Order extends Action {
  constructor() {
    super()
    this.intent = 'order'
    this.dependencies = [{ actions: ['Greetings'], isMissing: { en: [] } }]
  }
}

test('Bot#useDatabase', t => {
  const mock = sinon.mock(mongoose)
  const bot = new Bot()
  mock.expects('connect').once().throws()
  try {
    bot.useDatabase({})
  } catch (e) {
    t.true(e !== undefined && e !== null)
  }
  mock.verify()
})

test('Bot#registerAction', t => {
  class Invalid extends Action {
    constructor() {
      super()
      this.constraints = [{ entity: 'datetime', alias: 'departure' }]
    }
  }

  const bot = new Bot()
  let error = null
  try {
    bot.registerActions(Invalid)
  } catch (e) {
    error = e
  }
  t.true(error !== null)
  t.true(error.message === 'Invalid action: Invalid')
  t.is(_.keys(bot.actions).length, 0)

  error = null
  try {
    bot.registerActions(Greetings)
  } catch (e) {
    error = e
  }
  t.is(error, null)
  t.is(_.keys(bot.actions).length, 1)
})

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
