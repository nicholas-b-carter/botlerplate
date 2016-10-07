import readline from 'readline'
import _ from 'lodash'
import mongoose from 'mongoose'
import requireAll from 'require-all'

import Bot from './bot'
import config from '../../config'

const actions = requireAll(`${__dirname}/../actions`)

const recastToken = ''

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const token = recastToken || config.recastToken || process.env.TOKEN || process.argv[2]

const bot = new Bot({
  token,
  noIntent: config.noIntentAnsers || { en: ['Aye donte endeurstende'] },
})

bot.registerActions(_.values(actions))

if (process.argv.indexOf('--db') !== -1) {
  bot.useDatabase(config.database)
}

process.stdin.setEncoding('utf8')

/* eslint no-console: "off" */

const conversId = Math.floor((Math.random() * 1000) + 1).toString()

console.log()
process.stdout.write('> ')

rl.on('SIGINT', () => {
  mongoose.connection.close()
  rl.close()
})

rl.on('line', input => {
  console.log()
  bot.reply(input, conversId).then(res => {
    res.forEach(r => {
      console.log(r)
      console.log()
    })
    process.stdout.write('> ')
  }).catch(err => {
    console.log(`Error: ${err}`)
    console.log()
    process.stdout.write('> ')
  })
})
