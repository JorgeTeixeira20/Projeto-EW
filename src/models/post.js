const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  commentUserId: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true }
});

const commentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  commentUserId: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true },
  replies: [replySchema]
});

const postSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  userId: { type: String, required: true },
  resourceId: { type: String, required: true },
  content: { type: String, required: true },
  comments: [commentSchema],
  date: { type: Date, required: true }
});

module.exports = mongoose.model('Post', postSchema);
