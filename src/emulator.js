import readline from 'readline'
import _ from 'lodash'
import mongoose from 'mongoose'
import requireAll from 'require-all'

import Bot from './bot'

const actions = requireAll(`${__dirname}/actions`)

const recastToken = ''

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const token = recastToken || process.env.TOKEN || process.argv[2]

const bot = new Bot({
  token,
  language: 'en',
  noIntent: {
    en: ['Aye donte endeurstende'],
  },
})

bot.registerActions(_.values(actions))

bot.useDatabase({
  hostname: 'localhost',
  port: '27017',
  name: 'test',
})


process.stdin.setEncoding('utf8')

/* eslint no-console: "off" */

const conversId = Math.floor((Math.random() * 1000) + 1).toString()

console.log()
process.stdout.write('> ')

rl.on('SIGINT', () => {
  rl.question('Exit? Y/n ', answer => {
    if (answer === '' || answer.match(/^y(es)?$/i)) {
      if (bot.useDb) {
        mongoose.connection.close()
        rl.close()
      }
    }
  })
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
