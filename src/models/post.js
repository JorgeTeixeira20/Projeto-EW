const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  vote: { type: Number, required: true } 
});

const replySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  commentUserId: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true },
  votes: { type: Number, default: 0 },
  userVotes: [voteSchema] 
});

const commentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  commentUserId: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true },
  replies: [replySchema],
  votes: { type: Number, default: 0 },
  userVotes: [voteSchema] 
});

const postSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  userId: { type: String, required: true },
  resourceId: { type: String, required: true },
  content: { type: String, required: true },
  comments: [commentSchema],
  date: { type: Date, required: true },
  votes: { type: Number, default: 0 },
  userVotes: [voteSchema] 
});

module.exports = mongoose.model('Post', postSchema);
