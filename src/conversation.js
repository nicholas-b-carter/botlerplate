import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema({
  conversationId: String,
  memory: Object,
  conversationData: Object,
  userData: Object,
})

const Conversation = mongoose.mode('Conversation', conversationSchema)

module.exports = Conversation
