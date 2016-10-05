import Action from './action'
import Bot from './bot'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

class Greetings extends Action {
  constructor() {
    super()
    this.intent = 'greetings'
  }

  reply() {
    return { en: ['Hello! Do you already have an account ?'],
             fr: ['Bien le bonjour! Avez vous deja un compte chez nous ?'] }
  }
}

class Yes extends Action {
  constructor() {
    super()
    this.intent = 'yes'
    this.next = 'InfosSignin'
  }
  reply() {
    return ['Nice! Good to see you again! I just need some informations before we continue']
  }
}

class No extends Action {
  constructor() {
    super()
    this.intent = 'no'
    this.next = 'InfosSignup'
  }
  reply() {
    return ['Fair enough! Let\'s create one together. I just need some basic informations.']
  }
}

class Signup extends Action {
  constructor() {
    super()
    this.intent = 'signup'
    this.next = 'InfosSignup'
  }
  reply() {
    return { en: ['Alright let\'s do it'] }
  }
}

class Signin extends Action {
  constructor() {
    super()
    this.intent = 'signin'
    this.next = 'InfosSignin'
  }
  reply() {
    return { en: ['Alright let\'s do it'] }
  }
}

class InfosSignup extends Action {
  constructor() {
    super()
    this.intent = 'infos'
    this.dependencies = [{
      actions: ['No', 'Signup'],
      isMissing: ['Do you already have an account ?'],
    }]
    this.constraints = [{
      entities: [{ entity: 'person', alias: 'client' }],
      isMissing: ['How should I call you ?'],
    }, {
      entities: [{ entity: 'email', alias: 'mail-client' }],
      isMissing: ['What\'s the email address I can join you at?'],
    }]
    this.next = 'Murder'
  }
  reply() {
    return { en: ['Perfect {{client}}, let\'s go on'] }
  }
}

class InfosSignin extends Action {
  constructor() {
    super()
    this.intent = 'infos'
    this.dependencies = [{
      actions: ['Yes', 'Signin'],
      isMissing: ['Do you already have an account ?'],
    }]
    this.constraints = [{
      entities: [{ entity: 'person', alias: 'client' }],
      isMissing: ['What\'s the name you are registered with?'],
    }, {
      entities: [{ entity: 'email', alias: 'mail-client' }],
      isMissing: ['What\'s your email address ?'],
    }]
    this.next = 'Murder'
  }
  reply() {
    return { en: ['Perfect {{client}}, let\'s go on.'] }
  }
}

class Murder extends Action {
  constructor() {
    super()
    this.intent = 'murder'
    this.dependencies = [{
      actions: ['InfosSignup', 'InfosSignin'],
      isMissing: ['Do you already have an account?'],
    }]
    this.constraints = [{
      entities: [{ entity: 'location', alias: 'lieu' }],
      isMissing: ['Where can I find the target?'],
    }, {
      entities: [{ entity: 'person', alias: 'victim' }],
      isMissing: ['Who do you want me to kill?'],
    }]
  }
  reply() {
    return { en: ['Wonderful! {{victim}} will soon be buried. How do you want us to operate? We can eliminate him by burning or fire arms.'] }
  }
}


const bot = new Bot({
  token: '16a46f6e1deb16ac4476d5a1e11029cb',
  language: 'en',
  noIntent: {
    en: ['Aye donte endeurstende'],
  },
})
bot.registerActions([Greetings, Signin, Signup, InfosSignin, InfosSignup, Murder, Yes, No])
bot.useDatabase({
  hostname: 'localhost',
  port: '27017',
  name: 'test-bb',
})


process.stdin.setEncoding('utf8')

/* eslint no-console: "off" */

const conversId = Math.floor((Math.random() * 1000) + 1).toString()

console.log()
process.stdout.write('> ')

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
  })
})
