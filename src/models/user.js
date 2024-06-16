const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  course: { type: String, required: true },
  department: { type: String, required: true },
  admin: { type: Boolean, required: true, default: false },
  registrationDate: { type: Date, default: Date.now },
  lastAccessDate: { type: Date, default: Date.now },
  myResources: { type: [String], default: [] }, // Lista de strings para recursos
  myPosts: { type: [String], default: [] }, // Lista de strings para posts
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

module.exports = mongoose.model('User', userSchema);
