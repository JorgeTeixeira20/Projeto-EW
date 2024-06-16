const mongoose = require('mongoose');

const comunicadoSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comunicado', comunicadoSchema);
