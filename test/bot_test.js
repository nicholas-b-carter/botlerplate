import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon'
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

test('Bot#updateMemory', async t => {
  const conversation = {
    memory: {},
    conversationData: { states: {} },
    userData: {},
  }

  class Greeting extends Action {
    constructor() {
      super()
      this.intent = 'greetings'
      this.constraints = [
        {
          isMissing: { en: ['How should I call you?'] },
          entities: [{ entity: 'person', alias: 'name' }],
        },
      ]
    }
  }

  class Delivery extends Action {
    constructor() {
      super()
      this.intent = 'delivery'
      this.constraints = [
        {
          isMissing: { en: ['Wehre do you want to be delivered?'] },
          entities: [{ entity: 'datetime', alias: 'delivery-date' }],
        },
      ]
      this.dependencies = [{
        isMissing: {},
        actions: ['Greeting'],
      }]
    }
  }

  class Orderr extends Action {
    constructor() {
      super()
      this.intent = 'order'
      this.dependencies = [{
        isMissing: {},
        actions: ['Greetings'],
      }]
      this.constraints = [{
        isMissing: { en: ['What product would you like?'] },
        entities: [{ entity: 'number', alias: 'product' }],
      }, {
        isMissing: { en: ['Wehre do you want to be delivered?'] },
        entities: [{ entity: 'datetime', alias: 'date' }],
      }]
    }
  }

  class Goodbyes extends Action {
    constructor() {
      super()
      this.intent = 'goodbye'
      this.dependencies = [{
        isMissing: { en: ['I need to know what you want before...'] },
        actions: ['Order'],
      }, {
        isMissing: { en: ['Sorry but I need more informations'] },
        actions: ['Delivery'],
      }]
    }
  }

  const bot = new Bot()
  bot.registerActions([Greeting, Orderr, Delivery, Goodbyes])

  // It should update the knowledge of the main action
  let mainAction = bot.actions.Orderr
  let entities = {
    datetime: [{
      raw: 'tomorrow at 9pm',
      formatted: 'Saturday, 01 October 2016 at 09:00:00 PM',
      accuracy: 'day,hour',
      chronology: 'future',
      time: '2016-10-01T21:00:00',
      confidence: 0.99,
    }],
  }
  await bot.updateMemory(mainAction, entities, conversation)
  t.true(typeof conversation.memory.date === 'object')


  // It should not update if there is several knowledges
  mainAction = bot.actions.Greeting
  entities = {
    datetime: [{
      raw: 'tomorrow at 9pm',
      formatted: 'Saturday, 01 October 2016 at 09:00:00 PM',
      accuracy: 'day,hour',
      chronology: 'future',
      time: '2016-10-01T21:00:00',
      confidence: 0.99,
    }],
  }
  conversation.memory = {}

  await bot.updateMemory(mainAction, entities, conversation)
  t.true(typeof conversation.memory.date === 'undefined')
  t.true(typeof conversation.memory['delivery-date'] === 'undefined')

  // It should update several knowledges
  mainAction = bot.actions.Orderr
  entities = {
    person: [{
      raw: 'Jean Valjean',
      value: 'Jean Valjean',
    }],
    datetime: [{
      raw: 'tomorrow at 9pm',
      formatted: 'Saturday, 01 October 2016 at 09:00:00 PM',
      accuracy: 'day,hour',
      chronology: 'future',
      time: '2016-10-01T21:00:00',
      confidence: 0.99,
    }],
  }
  conversation.memory = {}

  await bot.updateMemory(mainAction, entities, conversation)
  t.true(typeof conversation.memory.date === 'object')
  t.true(typeof conversation.memory.name === 'object')
  t.true(typeof conversation.memory['delivery-date'] === 'undefined')
})
