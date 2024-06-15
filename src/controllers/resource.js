const Resource = require('../models/resource');

// List all resources
exports.list = async (req, res) => {
  try {
    const resources = await Resource.find().exec();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get resource by ID
exports.findById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).exec();
    if (resource) {
      res.json(resource);
    } else {
      res.status(404).json({ message: "Resource not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new resource
exports.create = async (req, res) => {
  try {
    const newResource = new Resource(req.body);
    await newResource.save();
    res.status(201).json(newResource);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update resource by ID
exports.update = async (req, res) => {
  try {
    const updatedResource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true }).exec();
    if (updatedResource) {
      res.json(updatedResource);
    } else {
      res.status(404).json({ message: "Resource not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete resource by ID
exports.delete = async (req, res) => {
  try {
    const deletedResource = await Resource.findByIdAndDelete(req.params.id).exec();
    if (deletedResource) {
      res.json({ message: "Resource deleted" });
    } else {
      res.status(404).json({ message: "Resource not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
