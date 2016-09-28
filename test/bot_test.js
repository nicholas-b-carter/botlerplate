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

test('Bot#actionIsDone', t => {
  const bot = new Bot()
  bot.registerActions([Greetings, Order])
  const conversation = {
    memory: {},
    userData: {},
    conversationData: {
      states: {},
    },
  }
  const ord = bot.findActionByName('Order')
  const greet = bot.findActionByName('Greetings')

  t.false(bot.actionIsDone(ord, conversation))
  t.false(bot.actionIsComplete(ord, conversation))

  t.false(bot.actionIsDone(greet, conversation))
  t.true(bot.actionIsComplete(greet, conversation))
  conversation.conversationData.states.Greetings = true
  t.true(bot.actionIsDone(greet, conversation))

  t.false(bot.actionIsDone(ord, conversation))
  t.true(bot.actionIsComplete(ord, conversation))
  conversation.conversationData.states.Order = true
  t.true(bot.actionIsDone(ord, conversation))
})

test('Bot#dependencyIsComplete', t => {
  const bot = new Bot()
  class Infos extends Action {
    constructor() {
      super()
      this.dependencies = [
        [{ action: 'Greetings' }, { action: 'Order' }],
        [{ action: 'Menus' }],
      ]
    }
  }
  class Menus extends Action {
  }
  const conversation = {
    memory: {},
    conversationData: {
      states: {},
    },
  }
  bot.registerActions([Infos, Greetings, Menus, Order])
  const infos = bot.findActionByName('Infos')
  t.false(bot.dependencyIsComplete(infos.dependencies[0][0], conversation))
  t.false(bot.dependencyIsComplete(infos.dependencies[0][1], conversation))
  t.false(bot.dependencyIsComplete(infos.dependencies[1][0], conversation))
  conversation.conversationData.states.Greetings = true
  t.true(bot.dependencyIsComplete(infos.dependencies[0][0], conversation))
  t.false(bot.dependencyIsComplete(infos.dependencies[0][1], conversation))
  conversation.conversationData.states.Menus = true
  t.true(bot.dependencyIsComplete(infos.dependencies[1][0], conversation))
})

test('Bot#dependenciesAreComplete', t => {
  const bot = new Bot()
  class Infos extends Action {
    constructor() {
      super()
      this.dependencies = [
        [{ action: 'Greetings' }, { action: 'Order' }],
        [{ action: 'Menus' }],
      ]
    }
  }
  class Menus extends Action {
  }
  const conversation = {
    memory: {},
    conversationData: {
      states: {},
    },
  }
  bot.registerActions([Infos, Greetings, Menus, Order])
  const infos = bot.findActionByName('Infos')
  t.false(bot.dependenciesAreComplete(infos.dependencies[0], conversation))
  t.false(bot.dependenciesAreComplete(infos.dependencies[1], conversation))
  conversation.conversationData.states.Greetings = true
  t.true(bot.dependenciesAreComplete(infos.dependencies[0], conversation))
  conversation.conversationData.states.Menus = true
  t.true(bot.dependenciesAreComplete(infos.dependencies[1], conversation))
})

test('Bot#actionIsComplete', t => {
  const bot = new Bot()
  const conversation = {
    memory: {},
    userData: {},
    conversationData: {
      states: {},
    },
  }
  bot.registerActions([Greetings, Order])
  const greet = bot.findActionByName('Greetings')
  const order = bot.findActionByName('Order')
  t.true(bot.actionIsComplete(greet, conversation))
  t.false(bot.actionIsComplete(order, conversation))
})

test('Bot#constraintIsComplete', t => {
  const bot = new Bot()
  const conversation = {
    memory: {},
    userData: {},
    conversationData: {
      states: {},
    },
  }
  class Menu extends Action {
    constructor() {
      super()
      this.constraints = [[{ entity: 'person', alias: 'name' }]]
    }
  }
  bot.registerActions([Greetings, Menu])
  const menu = bot.findActionByName('Menu')
  t.false(bot.constraintIsComplete(menu.constraints[0][0], conversation))
  conversation.memory.name = {
    raw: 'Jean Valjean',
    value: 'Jean Valjean',
  }
  t.true(bot.constraintIsComplete(menu.constraints[0][0], conversation))
})

test('Bot#constraintsAreComplete', t => {
  const bot = new Bot()
  const conversation = {
    memory: {},
    userData: {},
    conversationData: {
      states: {},
    },
  }
  class Menu extends Action {
    constructor() {
      super()
      this.constraints = [[
        { entity: 'person', alias: 'name' },
        { entity: 'color', alias: 'color' },
      ]]
    }
  }
  bot.registerActions(Menu)
  const menu = bot.findActionByName('Menu')
  t.false(bot.constraintsAreComplete(menu.constraints[0], conversation))
  conversation.memory.name = {
    raw: 'Jean Valjean',
    value: 'Jean Valjean',
  }
  t.true(bot.constraintsAreComplete(menu.constraints[0], conversation))
})

test('Bot#actionIsActionable', t => {
  const bot = new Bot()
  const conversation = {
    memory: {},
    userData: {},
    conversationData: {
      states: {},
    },
  }
  class Menu extends Action {
    constructor() {
      super()
      this.constraints = [[
        { entity: 'person', alias: 'name' },
        { entity: 'color', alias: 'color' },
      ]]
      this.dependencies = [[
        { action: 'Greetings' },
      ]]
    }
  }
  bot.registerActions([Greetings, Menu])
  const menu = bot.findActionByName('Menu')
  t.false(bot.actionIsActionable(menu, conversation))
  conversation.conversationData.states.Greetings = true
  t.true(bot.actionIsActionable(menu, conversation))
})
