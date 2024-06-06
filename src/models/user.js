const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  course: { type: String, required: true },
  department: { type: String, required: true },
  level: { type: String, required: true },
  registrationDate: { type: Date, required: true },
  lastAccessDate: { type: Date, required: true }
});

module.exports = mongoose.model('User', userSchema);
