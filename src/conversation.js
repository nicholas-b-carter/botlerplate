import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema({
  conversationId: String,
  memory: Object,
  actionStates: Object,
  userData: Object,
  lastAction: String,
})

const Conversation = mongoose.model('Conversation', conversationSchema)

module.exports = Conversation
