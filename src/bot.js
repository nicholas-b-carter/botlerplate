import _ from 'lodash'
import mongoose from 'mongoose'

class Bot {
  constructor() {
    this.actions = {}
  }

  useDatabase(conf) {
    let db = 'mongodb://'
    if (conf.username) {
      db = `${db}${conf.username}:${conf.password}@`
    }
    db = `${db}${conf.hostname}:${conf.port}/${conf.name}?ssl=${conf.ssl}`

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
      // TODO
    })
  }

  // expandVariables takes a string and returns
  // the reply with variables replaced by their respective values
  expandVariables(reply, memory) {
    // TODO
  }

  reply(input, conversationId) {
    return new Promise((resolve, reject) => {
      // TODO
    })
  }

  // Updates memory with input's entities
  // Priority: 1) constraint of the current action
  //           2) any constraint that is alone in the bot
  updateMemory(action, entities, conversation) {
    const actionKnowledges = action.constraints.map(c => c.entities).reduce((a, b) => a.concat(b))
    return new Promise((resolve, reject) => {
      const promises = []

      // loop through the entities map
      _.toPairs(entities).forEach(([name, ents]) => {
        // search for a constraint of the current action
        const actionKnowledge = actionKnowledges.find(k => k.entity === name)

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
            const gblKnowledges = _.values(this.actions).map(a => a.constraints)
                                               .reduce((a, b) => a.concat(b))
                                               .map(c => c.entities)
                                               .reduce((a, b) => a.concat(b))
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
