const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true }
});

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, required: true }
});

const resourceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, required: true },
  dataCriacao: { type: Date, required: true },
  dataRegisto: { type: Date, required: true },
  visibilidade: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true },
  themes: [{ type: String, required: true }],
  files: [fileSchema],
  reviews: [reviewSchema]
});

module.exports = mongoose.model('resources', resourceSchema);
