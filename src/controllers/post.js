const Post = require('../models/post');

// List all posts
exports.list = async (req, res) => {
  try {
    const posts = await Post.find().exec();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get post by ID
exports.findById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).exec();
    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new post
exports.create = async (req, res) => {
  try {
    const newPost = new Post(req.body);
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update post by ID
exports.update = async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true }).exec();
    if (updatedPost) {
      res.json(updatedPost);
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete post by ID
exports.delete = async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id).exec();
    if (deletedPost) {
      res.json({ message: "Post deleted" });
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add comment to post
exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).exec();
    if (post) {
      post.comments.push(req.body);
      await post.save();
      res.status(201).json(post);
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
