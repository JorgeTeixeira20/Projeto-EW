const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true }
});

const rankingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, required: true }
});

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, required: true },
  themes: [{ type: String, required: true }],
  files: [fileSchema],
  rankings: [rankingSchema]
});

module.exports = mongoose.model('Resource', resourceSchema);
