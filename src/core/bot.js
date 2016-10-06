import _ from 'lodash'
import axios from 'axios'
import mongoose from 'mongoose'

import Conversation from './conversation'

mongoose.Promise = global.Promise

class Bot {
  constructor(opts) {
    this.actions = {}
    this.token = opts && opts.token
    this.language = opts && opts.language
    this.noIntent = opts && opts.noIntent
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
      if (this.actions[newAction.name()]) {
        throw new Error(`${newAction.name()} is already registered`)
      }
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

  evaluateReply(reply, memory) {
    if (typeof reply === 'string') {
      return this.expandVariables(reply, memory)
    }

    return reply
  }

  callToRecast(text, token, language) {
    const data = { text }
    if (language) {
      data.language = language
    }
    return axios({
      method: 'post',
      headers: { Authorization: `Token ${token}` },
      url: 'https://api-development.recast.ai/v2/request',
      data,
    })
  }

  reply(input, conversationId, opts) {
    const tok = (opts && opts.token) || this.token
    const language = (opts && opts.language) || this.language
    return new Promise((resolve, reject) => {
      if (!tok) {
        return reject('No token provided')
      }

      this.initialize(conversationId).then(conversation => {
        if (!conversation.memory) { conversation.memory = {} }
        if (!conversation.userData) { conversation.userData = {} }
        if (!conversation.actionStates) { conversation.actionStates = {} }

        this.callToRecast(input, tok, language).then(res => {
          const results = res.data.results
          let act = null

          if (results.intents.length === 0) {
            act = this.searchActionWithoutIntent(conversation, results.entities)
            if (!act && this.noIntent) {
              return resolve(this.evaluateReply(this.pickReplies([this.noIntent],
                                                                 results.language)))
            }
            if (!act) {
              return reject('No response when no intent is matched')
            }
          }


          let action = act || this.retrieveAction(conversation, results.intents[0].slug)

          if (!action) {
            return reject(new Error(`No action found for intent ${results.intents[0].slug}`))
          }
          const replies = []

          let message = null
          let lastAction = null
          while (!action.isActionable(this.actions, conversation)) {
            const deps = action.getMissingDependencies(this.actions, conversation)

            const dep = action.getRandom(deps)
            message = dep.isMissing
            if (dep.actions.length > 1) {
              lastAction = action.name()
              action = null
              break
            }

            action = this.actions[dep.actions[0]]
          }

          if (action) { lastAction = action.name() }
          conversation.lastAction = lastAction

          if (message) { replies.push(message) }

          this.updateMemory(results.entities, conversation, action).then(msg => {
            if (msg) { replies.push(msg) }

            if (action) {
              action.process(conversation, this.actions, results)
                .then(resp => {
                  let p = Promise.resolve()
                  if (action.isComplete(this.actions, conversation)) {
                    conversation.actionStates[action.name()] = true
                    if (action.endConversation) {
                      conversation.memory = {}
                      conversation.actionStates = {}
                      conversation.userData = {}
                      conversation.lastAction = null
                    } else if (action.next) {
                      p = this.actions[action.next].process(conversation, this.actions, results)
                    }
                  }
                  p.then(nextResp => {
                    this.saveConversation(conversation, () => {
                      replies.push(resp)
                      if (nextResp) { replies.push(nextResp) }
                      const resps = this.pickReplies(replies, language)
                      return resolve(resps.map(r => this.evaluateReply(r, conversation.memory)))
                    })
                  })
                }).catch(reject)
            } else {
              this.saveConversation(conversation, () => {
                const resps = this.pickReplies(replies, language)
                return resolve(resps.map(r => this.evaluateReply(r, conversation.memory)))
              })
            }
            return true
          }).catch(reject)
          return true
        }).catch(reject)
      }).catch(reject)

      return true
    })
  }

  pickReplies(responses, language) {
    return responses.map(r => {
      if (Array.isArray(r)) { return this.getRandom(r) }

      const resps = r[language]

      if (Array.isArray(resps)) { return this.getRandom(resps) }

      return resps
    })
  }

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)]
  }

  // Updates memory with input's entities
  // Priority: 1) constraint of the current action
  //           2) any constraint that is alone in the bot
  updateMemory(entities, conversation, action) {
    let actionKnowledges = null
    if (action) {
      actionKnowledges = _.flatten(action.constraints.map(c => c.entities))
    }
    return new Promise(resolve => {
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
          return resolve(e[e.length - 1])
        }

        return resolve()
      })
      return true
    })
  }

  nextOf(action) {
    return _.values(this.actions).filter(a => a.allDependencies().indexOf(action.name()) !== -1)
  }

  searchActionWithoutIntent(conversation, entities) {
    const last = this.actions[conversation.lastAction]
    if (!last) { return null }

    if (this.shouldChooseAction(last, conversation, entities)) {
      return last
    }

    const nexts = this.nextOf(last)

    if (nexts.length !== 1) { return null }

    if (this.shouldChooseAction(nexts[0], conversation, entities)) {
      return nexts[0]
    }

    return null
  }

  shouldChooseAction(action, conversation, entities) {
    let shouldChoose = false

    _.forOwn(entities, (values, key) => {
      const constraint = action.allConstraints().find(c => c.entity === key)
      if (values.length === 1 && constraint && !conversation.memory[constraint.alias]) {
        shouldChoose = true
      }
    })
    return shouldChoose
  }

  retrieveAction(conversation, intent) {
    const matchingActions = _.values(this.actions).filter(a => a.intent === intent)
    const lastAction = this.actions[conversation.lastAction]
    let action = null

    if (matchingActions.length === 0) {
      return null
    } else if (matchingActions.length === 1) {
      return matchingActions[0]
    }

    if (lastAction && matchingActions.length > 1) {
      if (lastAction.isDone(conversation)) {
        action = matchingActions.find(a => this.nextOf(lastAction).indexOf(a) !== -1)
      } else {
        action = matchingActions.find(a => a.name() === lastAction.name())
      }
    }

    return action || this.findActionByLevel(conversation, intent) || matchingActions[0]
  }

  /* eslint no-loop-func: "off" */

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
    if (this.useDb) {
      conversation.markModified('userData')
      conversation.markModified('actionStates')
      conversation.markModified('memory')
      conversation.markModified('lastAction')
      conversation.save(err => {
        if (cb) {
          cb(err)
        }
      })
    } else if (cb) {
      cb()
    }
  }
}

module.exports = Bot
