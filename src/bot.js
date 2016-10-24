import _ from 'lodash'
import requireAll from 'require-all'

import { Bot } from 'bot-dialog-manager'
import config from '../config'

const actions = requireAll(`${__dirname}/actions`)

const recastToken = ''

const token = recastToken || config.recastToken || process.env.TOKEN || process.argv[2]

const myBot = new Bot({
  token,
  fallbackReplies: {
    en: ['Aye donte endeurstende'],
    fr: ['Moi yen a pas comprendre'],
  },
})

myBot.registerActions(_.values(actions))

module.exports = myBot
