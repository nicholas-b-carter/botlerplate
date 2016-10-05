import _ from 'lodash'
import mongoose from 'mongoose'

import Conversation from './conversation'

mongoose.Promise = global.Promise

class Bot {
  constructor() {
    this.actions = {}
  }

  useDatabase(conf) {
    this.useDb = true
    let db = 'mongodb://'
    if (conf.username) {
      db = `${db}${conf.username}:${conf.password}@`
    }
    db = `${db}${conf.hostname}:${conf.port}/${conf.name}`
    if (conf.ssl !== undefined) {
      db = `{db}?ssl=${conf.ssl}`
    }

    mongoose.connect(db, (err) => {
      if (err) { throw err }
    })
  }

  registerActions(Actions) {
    if (Array.isArray(Actions)) {
      Actions.forEach(action => { this.registerActions(action) })
    } else {
      const newAction = new Actions()
      if (!newAction.validate()) {
        throw new Error(`Invalid action: ${newAction.name()}`)
      }
      this.actions[newAction.name()] = newAction
    }
  }

  findActionByName(name) {
    return this.actions[name]
  }

  // Marks an action as done
  markActionAsDone(action, conversation) {
    if (typeof action === 'string') {
      conversation.actionStates[action] = true
    } else {
      conversation.actionStates[action.name()] = true
    }
  }

  // initialize should resolve the conversation linked to the conversationId
  // The conversation should be found or created in db, or directly instanciated
  initialize(conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.useDb) {
        return resolve(new Conversation({
          conversationId,
          userData: {},
          memory: {},
          actionStates: {},
        }))
      }
      Conversation.findOne({ conversationId }).then(res => {
        if (res) {
          return resolve(res)
        }
        Conversation.create({
          conversationId,
          userData: {},
          memory: {},
          actionStates: {},
        }).then(resolve).catch(reject)
        return true
      }).catch(err => reject(err))
      return true
    })
  }

  // expandVariables takes a string and returns
  // the reply with variables replaced by their respective values
  expandVariables(reply, memory) {
    const replacer = (match, v, f) => {
      if (!memory[v]) { return '' }
      const variable = memory[v]
      const field = f || 'raw'
      if (!variable[field]) { return '' }
      return variable[field]
    }
    return reply.replace(/{{\s*([a-zA-Z0-9\-_]+)\.?([a-zA-Z0-9\-_]+)?\s*}}/, replacer)
  }

  reply(input, conversationId) {
    return new Promise((resolve, reject) => {
      // TODO
    })
  }

  // Updates memory with input's entities
  // Priority: 1) constraint of the current action
  //           2) any constraint that is alone in the bot
  updateMemory(entities, conversation, action) {
    let actionKnowledges = null
    if (action) {
      actionKnowledges = action.constraints.map(c => c.entities).reduce((a, b) => a.concat(b))
    }
    return new Promise((resolve, reject) => {
      const promises = []

      // loop through the entities map
      _.toPairs(entities).forEach(([name, ents]) => {
        // search for a constraint of the current action
        const actionKnowledge =
          (actionKnowledges && actionKnowledges.find(k => k.entity === name)) || null
        ents.forEach(entity => {
          if (actionKnowledge) {
            const validator = actionKnowledge.validator || (e => e)

            promises.push(((n, ent) => new Promise((resolv, rejec) => {
              Promise.resolve(validator(ent, conversation.memory)).then(res => {
                resolv({ name: n, value: res || ent })
              }).catch(err => {
                rejec(err)
              })
            }))(actionKnowledge.alias, entity))
          } else {
            const gblKnowledges = _.flatten(_.values(this.actions)
                                             .map(a => a.allConstraints()))
                                   .filter(k => k.entity === name)

            if (gblKnowledges.length === 1) {
              const validator = gblKnowledges[0].validator || (e => e)

              promises.push(((n, ent) => new Promise((resolv, rejec) => {
                Promise.resolve(validator(ent, conversation.memory)).then(res => {
                  resolv({ name: n, value: res || ent })
                }).catch(err => {
                  rejec(err)
                })
              }))(gblKnowledges[0].alias, entity))
            }
          }
        })
      })

      if (promises.length === 0) {
        return resolve()
      }

      const e = []
      Promise.all(promises.map(p => p.catch(err => { e.push(err) }))).then(res => {
        res.filter(el => el !== undefined).forEach(entity => {
          const { name, value } = entity
          conversation.memory[name] = value
        })

        if (e.length > 0) {
          return reject(e[e.length - 1])
        }

        return resolve()
      })
      return true
    })
  }

  nextOf(action) {
    return _.values(this.actions).filter(a => a.allDependencies().indexOf(action.name()) !== -1)
  }

  retrieveAction(conversation, intent) {
    const matchingActions = _.values(this.actions).filter(a => a.intent === intent)
    const lastAction = this.actions[conversation.lastAction] || null
    let action = null

    if (matchingActions.length === 0) {
      // handle
    }

    if (lastAction && matchingActions.length > 1) {
      if (lastAction.isDone(conversation)) {
        action = matchingActions.find(a => this.nextOf(lastAction).indexOf(a) !== -1)
      } else {
        action = matchingActions.find(a => a.name() === lastAction.name())
      }
    }

    return action || matchingActions[0]
  }

  /* eslint no-loop-func: "error" */

  findActionByLevel(conversation, intent) {
    const requiredActions = new Set(_.flatten(_.values(this.actions).map(a => a.allDependencies())))
    const leafs = _.keys(this.actions).filter(a => !requiredActions.has(a))
    let queue = leafs.map(a => this.actions[a])
    const buffer = []
    let level = 0

    while (queue.length > 0) {
      queue.filter(a => a.intent === intent).forEach(action => {
        if (!action.isDone(conversation)) {
          buffer.push({ level, action })
        }
      })

      const sublevel = _.flatten(queue.map(a => a.allDependencies().map(ac => this.actions[ac])))

      queue = sublevel
      level += 1
    }

    if (buffer.length === 0) { return null }

    const sorted = buffer.sort((a, b) => a.level - b.level)

    return sorted[sorted.length - 1].action
  }

  saveConversation(conversation, cb) {
    conversation.markModified('userData')
    conversation.markModified('states')
    conversation.markModified('memory')
    conversation.save(err => {
      if (cb) {
        cb(err)
      }
    })
  }
}

module.exports = Bot
