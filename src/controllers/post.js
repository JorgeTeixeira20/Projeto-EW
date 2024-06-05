const Post = require('../models/Post');

const createPost = async (req, res) => {
  try {
    const { userId, title, author, year, type, themes, content } = req.body;
    const files = req.files.map((file) => ({
      name: file.originalname,
      path: file.path
    }));

    const post = new Post({ userId, title, author, year, type, themes, files, content });
    await post.save();
    res.status(201).send(post);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('userId');
    res.send(posts);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId');
    if (!post) {
      return res.status(404).send({ error: 'Post not found' });
    }
    res.send(post);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { postId, userId, content } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send({ error: 'Post not found' });
    }
    post.comments.push({ userId, content });
    await post.save();
    res.status(201).send(post);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const ratePost = async (req, res) => {
  try {
    const { postId, userId, stars } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send({ error: 'Post not found' });
    }
    post.rankings.push({ userId, stars });
    await post.save();
    res.status(201).send(post);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  addComment,
  ratePost
};