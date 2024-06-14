const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const User = require('../models/user');
const Resource = require('../models/resource');
const Post = require('../models/post');
const verifyJWT = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });
router.use(verifyJWT);

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({});
    const resources = await Resource.find({});
    
    console.log('Posts:', posts);
    console.log('Resources:', resources);
    
    const items = [
      ...posts.map(post => ({ ...post.toObject(), type: 'post', title: post.content })), 
      ...resources.map(resource => ({ ...resource.toObject(), type: 'resource', title: resource.title }))
    ];

    items.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por data, mais recente primeiro
    
    console.log('Items:', items);

    res.render('main', { items });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar posts e recursos.');
  }
});

router.get('/listaRecursos', async (req, res) => {
  try {
    const resources = await Resource.find({});
    res.render('listaRecursos', { userId: req.user._id, resources });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recursos.');
  }
});

router.get('/listaPosts', async (req, res) => {
  try {
    const posts = await Post.find({});
    res.render('listaPosts', { userId: req.user._id, posts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar posts.');
  }
});

router.get('/post/:id', verifyJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const resource = await Resource.findById(post.resourceId);
    if (!resource) {
      return res.status(404).send('Resource não encontrado');
    }

    console.log('Post encontrado:', post);
    console.log('Resource encontrado:', resource);

    res.render('post', { post, resource });
  } catch (err) {
    console.error('Erro ao buscar post:', err);
    res.status(500).send('Erro ao buscar post');
  }
});

router.post('/post/:id/comment', verifyJWT, async (req, res) => {
  const { content } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const newComment = {
      _id: new mongoose.Types.ObjectId().toString(),
      commentUserId: req.user.id,
      content,
      date: new Date(),
      replies: []
    };

    post.comments.push(newComment);
    await post.save();

    res.redirect(`/post/${req.params.id}`);
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err);
    res.status(500).send('Erro ao adicionar comentário');
  }
});

router.post('/post/:id/comment/:commentId/reply', verifyJWT, async (req, res) => {
  const { content } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).send('Comentário não encontrado');
    }

    const newReply = {
      _id: new mongoose.Types.ObjectId().toString(),
      commentUserId: req.user.id,
      content,
      date: new Date()
    };

    comment.replies.push(newReply);
    await post.save();

    res.redirect(`/post/${req.params.id}`);
  } catch (err) {
    console.error('Erro ao adicionar resposta:', err);
    res.status(500).send('Erro ao adicionar resposta');
  }
});

router.get('/resource/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).send('Recurso não encontrado');
    }
    res.render('recurso', { resource });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recurso');
  }
});

router.get('/perfil', async (req, res) => {
  try {
    const email = req.user.email;

    const user = await User.findOne({ email }).exec();

    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    // Fetch user resources
    const resources = await Resource.find({ _id: { $in: user.myResources } }).exec();

    // Calculate average ratings
    let totalStars = 0;
    let totalReviews = 0;
    let highestRatedResource = null;
    let highestRating = 0;

    resources.forEach(resource => {
      let resourceTotalStars = 0;
      resource.reviews.forEach(review => {
        totalStars += review.stars;
        resourceTotalStars += review.stars;
        totalReviews++;
      });

      const resourceAverageRating = resource.reviews.length > 0 ? (resourceTotalStars / resource.reviews.length) : 0;
      if (resourceAverageRating > highestRating) {
        highestRating = resourceAverageRating;
        highestRatedResource = resource;
      }
    });

    const averageRating = totalReviews > 0 ? (totalStars / totalReviews) : 0;

    // Count resources and posts
    const resourceCount = user.myResources.length;
    const postCount = user.myPosts.length;

    res.render('perfil', { user, resourceCount, averageRating, postCount, highestRatedResource });
  } catch (err) {
    console.error('Erro ao buscar perfil do usuário:', err);
    res.status(500).send('Erro ao buscar perfil do usuário');
  }
});

router.get('/perfil/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).exec();

    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    const resources = await Resource.find({ _id: { $in: user.myResources } }).exec();

    let totalStars = 0;
    let totalReviews = 0;
    let highestRatedResource = null;
    let highestRating = 0;

    resources.forEach(resource => {
      let resourceTotalStars = 0;
      resource.reviews.forEach(review => {
        totalStars += review.stars;
        resourceTotalStars += review.stars;
        totalReviews++;
      });

      const resourceAverageRating = resource.reviews.length > 0 ? (resourceTotalStars / resource.reviews.length) : 0;
      if (resourceAverageRating > highestRating) {
        highestRating = resourceAverageRating;
        highestRatedResource = resource;
      }
    });
    const averageRating = totalReviews > 0 ? (totalStars / totalReviews) : 0;

    const resourceCount = user.myResources.length;
    const postCount = user.myPosts.length;

    res.render('perfil', { user, resourceCount, averageRating, postCount, highestRatedResource });
  } catch (err) {
    console.error('Erro ao buscar perfil do usuário:', err);
    res.status(500).send('Erro ao buscar perfil do usuário');
  }
});

router.get('/rankings', (req, res) => {
  res.render('rankings');
});

router.get('/adicionarRecurso', (req, res) => {
  res.render('addRec');
});

router.post('/adicionarRecurso', upload.array('ficheiros', 10), async (req, res) => {
  let form = req.body;
  let files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  const storageDir = path.join(__dirname, '../public/filestore/');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  let uploadedFiles = [];
  try {
    for (let file of files) {
      let oldPath = path.join(__dirname, '../', file.path);
      let newPath = path.join(storageDir, file.originalname);

      console.log(`Moving file from ${oldPath} to ${newPath}`); 
      
      fs.renameSync(oldPath, newPath);

      if (!fs.existsSync(newPath)) {
        throw new Error(`File move failed: ${newPath} does not exist after move`);
      }

      uploadedFiles.push({
        fileName: file.originalname,
        filePath: `/filestore/${file.originalname}`
      });
    }
  } catch (err) {
    console.error('Erro ao mover o arquivo:', err);
    return res.status(500).send('Erro ao mover o arquivo.');
  }

  // Create a new resource in the database
  try {
    const userId = req.user.id;
    const userName = req.user.email;

    const resource = new Resource({
      _id: new mongoose.Types.ObjectId().toString(),
      type: form.categoria,
      title: form.titulo,
      subtitle: form.subtitulo,
      description: form.descricao,
      dataCriacao: new Date(),
      dataRegisto: new Date(),
      visibilidade: form.visibilidade,
      author: req.user.email,
      user: userId,
      year: new Date().getFullYear(),
      themes: [], 
      files: uploadedFiles,
      reviews: []
    });
    await resource.save();

    res.redirect('/listaRecursos');
  } catch (err) {
    console.error('Erro ao salvar o recurso:', err);
    res.status(500).send('Erro ao salvar o recurso.');
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('users', { title: 'Lista de Usuários', users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários');
  }
});

// Single file download route
router.get('/download/:fname', (req, res) => {
  let filePath = path.join(__dirname, '../public/filestore/', req.params.fname);
  res.download(filePath);
});

// Route to download all files in a resource as a zip
router.get('/download-all/:resourceId', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.resourceId);
    if (!resource) {
      return res.status(404).send('Recurso não encontrado');
    }

    const zip = archiver('zip', {
      zlib: { level: 9 } 
    });

    res.attachment(`${resource.title}.zip`);
    zip.pipe(res);

    resource.files.forEach(file => {
      const filePath = path.join(__dirname, '../public', file.filePath);
      zip.file(filePath, { name: file.fileName });
    });

    zip.finalize();
  } catch (err) {
    console.error('Erro ao criar o arquivo zip:', err);
    res.status(500).send('Erro ao criar o arquivo zip.');
  }
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.redirect('/auth'); 
    });
  });
});

module.exports = router;
