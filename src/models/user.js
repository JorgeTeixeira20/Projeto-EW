const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  course: { type: String, required: true },
  department: { type: String, required: true },
  level: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  lastAccessDate: { type: Date, default: Date.now },
  myResources: { type: [mongoose.Schema.Types.ObjectId], ref: 'Resource', default: [] },
  myPosts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Post', default: [] }
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

module.exports = mongoose.model('User', userSchema);
