const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
});

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  author: { type: String, required: true },
  files: [fileSchema],
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;