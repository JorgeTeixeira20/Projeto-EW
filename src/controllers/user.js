const User = require('../models/User');

const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    res.send(user);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById
};