const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true }
});

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const rankingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stars: { type: Number, required: true }
});

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, required: true },
  themes: [{ type: String, required: true }],
  files: [fileSchema],
  comments: [commentSchema],
  rankings: [rankingSchema],
  content: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
