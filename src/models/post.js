const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true, enum: ['upvote', 'downvote'] }
});

const votesSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  details: { type: [voteSchema], default: [] }
});

const replySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  commentUserId: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true },
  votes: { type: votesSchema, default: () => ({ count: 0, details: [] }) },
});

const commentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  commentUserId: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true },
  replies: { type: [replySchema], default: [] },
  votes: { type: votesSchema, default: () => ({ count: 0, details: [] }) },
});

const postSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  userId: { type: String, required: true },
  resourceId: { type: String, required: true },
  content: { type: String, required: true },
  comments: { type: [commentSchema], default: [] },
  date: { type: Date, required: true },
  votes: { type: votesSchema, default: () => ({ count: 0, details: [] }) },
});

module.exports = mongoose.model('Post', postSchema);
