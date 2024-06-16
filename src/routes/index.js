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
const Comunicado = require('../models/comunicado');
const { verifyJWT, setUser } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });
router.use(verifyJWT);
router.use(setUser);

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({}).lean();
    const resources = await Resource.find({}).lean();
    const comunicados = await Comunicado.find({}).lean();

    // Combine posts e resources em uma única lista
    const items = [
      ...posts.map(post => ({ ...post, type: 'post' })),
      ...resources.map(resource => ({ ...resource, type: 'resource' })),
      ...comunicados.map(comunicado => ({ ...comunicado, type: 'comunicado' }))
    ];

    // Ordenar por data, mais recente primeiro
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.render('main', { items });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar posts, recursos e comunicados.');
  }
});

router.get('/listaRecursos', async (req, res) => {
  const searchQuery = req.query.search;
  let resources;
  try {
    if (searchQuery) {
      const regex = new RegExp(searchQuery, 'i'); // i para case insensitive
      resources = await Resource.find({ title: regex });
    } else {
      resources = await Resource.find();
    }
    res.render('listaRecursos', { resources });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recursos');
  }
});


router.get('/listaPosts', async (req, res) => {
  try {
    const posts = await Post.find({}).lean();

    // Buscar detalhes do usuário para cada post
    const userIds = posts.map(post => post.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();

    // Criar um mapa de userId para usuário
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});

    // Adicionar as informações do usuário a cada post
    const postsWithUserDetails = posts.map(post => {
      return {
        ...post,
        user: userMap[post.userId] || null
      };
    });

    res.render('listaPosts', { userId: req.user._id, posts: postsWithUserDetails });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar posts.');
  }
});
router.get('/post/:id', verifyJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const resource = await Resource.findById(post.resourceId).lean();
    if (!resource) {
      return res.status(404).send('Resource não encontrado');
    }
    const user = await User.findById(post.userId).lean();
    if (!user) {
      return res.status(404).send('User não encontrado');
    }

    // Coletar todos os IDs de usuários de comentários e replies
    const commentUserIds = new Set();
    post.comments.forEach(comment => {
      commentUserIds.add(comment.commentUserId);
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
          commentUserIds.add(reply.commentUserId);
        });
      }
    });

    // Buscar usuários a partir dos IDs coletados
    const users = await User.find({ _id: { $in: Array.from(commentUserIds) } }).lean();

    // Criar um mapa de IDs de usuário para objetos de usuário
    const userMap = users.reduce((map, user) => {
      map[user._id] = user;
      return map;
    }, {});

    // Incluir dados do usuário em cada comentário e reply
    post.comments = post.comments.map(comment => {
      return {
        ...comment,
        user: userMap[comment.commentUserId],
        replies: comment.replies.map(reply => {
          return {
            ...reply,
            user: userMap[reply.commentUserId]
          };
        })
      };
    });

    console.log('Post encontrado:', post);
    console.log('Resource encontrado:', resource);
    console.log('User encontrado:', user);

    res.render('post', { post, resource, user });
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
    const email = req.user.email;

    const user = await User.findOne({ email }).exec();

    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).send('Recurso não encontrado');
    }
    res.render('recurso', { resource, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recurso');
  }
});

router.get('/create-post/:resourceId', verifyJWT, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.resourceId);
    if (!resource) {
      return res.status(404).send('Recurso não encontrado');
    }
    res.render('criarPost', { resource, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recurso');
  }
});

// Rota para criar um novo post
router.post('/create-post/:resourceId', verifyJWT, async (req, res) => {
  try {
    const { title, subtitle, content } = req.body;
    const newPost = new Post({
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      subtitle,
      userId: req.user.id,
      resourceId: req.params.resourceId,
      content,
      comments: [],
      date: new Date()
    });
    
    await newPost.save();
    
    // Adiciona o ID do novo post à lista de posts do usuário
    await User.findByIdAndUpdate(req.user.id, { $push: { myPosts: newPost._id } });

    res.redirect(`/post/${newPost._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar post');
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

    // Count the type of resources
    const resourceTypeCounts = {};

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

      // Count the resource types
      if (resource.type in resourceTypeCounts) {
        resourceTypeCounts[resource.type]++;
      } else {
        resourceTypeCounts[resource.type] = 1;
      }
    });

    const averageRating = totalReviews > 0 ? (totalStars / totalReviews) : 0;
    const resourceCount = user.myResources.length;
    const postCount = user.myPosts.length;

    // Determine the most frequent resource types
    const maxCount = Math.max(...Object.values(resourceTypeCounts));
    const mostFrequentTypes = Object.keys(resourceTypeCounts).filter(type => resourceTypeCounts[type] === maxCount);

    res.render('perfil', {
      user,
      resourceCount,
      averageRating,
      postCount,
      highestRatedResource,
      mostFrequentTypes
    });
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

    // Calculate average ratings
    let totalStars = 0;
    let totalReviews = 0;
    let highestRatedResource = null;
    let highestRating = 0;

    // Count the type of resources
    const resourceTypeCounts = {};

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

      // Count the resource types
      if (resource.type in resourceTypeCounts) {
        resourceTypeCounts[resource.type]++;
      } else {
        resourceTypeCounts[resource.type] = 1;
      }
    });

    const averageRating = totalReviews > 0 ? (totalStars / totalReviews) : 0;
    const resourceCount = user.myResources.length;
    const postCount = user.myPosts.length;

    // Determine the most frequent resource types
    const maxCount = Math.max(...Object.values(resourceTypeCounts));
    const mostFrequentTypes = Object.keys(resourceTypeCounts).filter(type => resourceTypeCounts[type] === maxCount);

    res.render('perfil', {
      user,
      resourceCount,
      averageRating,
      postCount,
      highestRatedResource,
      mostFrequentTypes
    });
  } catch (err) {
    console.error('Erro ao buscar perfil do usuário:', err);
    res.status(500).send('Erro ao buscar perfil do usuário');
  }
});

router.get('/rankings', async (req, res) => {
  try {
    const resources = await Resource.find({});

    // Calcular a média de classificações
    resources.forEach(resource => {
      const totalStars = resource.reviews.reduce((sum, review) => sum + review.stars, 0);
      resource.averageRating = resource.reviews.length > 0 ? (totalStars / resource.reviews.length) : 0;
    });

    // Ordenar os recursos pela média de classificações em ordem decrescente
    resources.sort((a, b) => b.averageRating - a.averageRating);

    // Obter os top 5 recursos
    const topResources = resources.slice(0, 5);

    // Calcular as médias de avaliação por usuário
    const userRatings = {};

    resources.forEach(resource => {
      if (!userRatings[resource.user]) {
        userRatings[resource.user] = { totalStars: 0, totalReviews: 0 };
      }
      userRatings[resource.user].totalStars += resource.reviews.reduce((sum, review) => sum + review.stars, 0);
      userRatings[resource.user].totalReviews += resource.reviews.length;
    });

    // Calcular a média de avaliação por usuário
    const userAverageRatings = Object.keys(userRatings).map(userId => {
      const { totalStars, totalReviews } = userRatings[userId];
      return {
        userId,
        averageRating: totalReviews > 0 ? totalStars / totalReviews : 0
      };
    });

    // Ordenar os usuários pela média de avaliação em ordem decrescente
    userAverageRatings.sort((a, b) => b.averageRating - a.averageRating);

    // Obter os top 5 usuários
    const topUsers = userAverageRatings.slice(0, 5);

    // Buscar os detalhes dos usuários
    const topUserIds = topUsers.map(user => user.userId);
    const topUserDetails = await User.find({ _id: { $in: topUserIds } }).lean();

    // Mapear os detalhes dos usuários
    const topUsersWithDetails = topUsers.map(user => {
      const userDetails = topUserDetails.find(u => u._id.toString() === user.userId);
      return {
        ...user,
        firstName: userDetails ? userDetails.firstName : 'Unknown',
        lastName: userDetails ? userDetails.lastName : 'User'
      };
    });

    res.render('rankings', { topResources, topUsers: topUsersWithDetails });
  } catch (err) {
    console.error('Erro ao buscar recursos para o ranking:', err);
    res.status(500).send('Erro ao buscar recursos para o ranking.');
  }
});

// Rota para exibir os recursos do usuário logado
router.get('/meusrecursos', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const searchQuery = req.query.search;
    const user = await User.findById(userId);
    const resourceIds = user.myResources;

    let resources;
    if (searchQuery) {
      resources = await Resource.find({
        _id: { $in: resourceIds },
        title: { $regex: searchQuery, $options: 'i' }
      });
    } else {
      resources = await Resource.find({ _id: { $in: resourceIds } });
    }

    res.render('meusrecursos', { resources });
  } catch (err) {
    console.error('Erro ao buscar recursos do usuário:', err);
    res.status(500).send('Erro ao buscar recursos do usuário');
  }
});


// Rota para exibir os posts do usuário logado
router.get('/meusposts', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('myPosts');
    const posts = await Post.find({ _id: { $in: user.myPosts } });

    res.render('meusposts', { posts, user: req.user });
  } catch (err) {
    console.error('Erro ao buscar posts do usuário:', err);
    res.status(500).send('Erro ao buscar posts do usuário');
  }
});

// Rota para exibir o formulário de adição de recurso
router.get('/adicionarRecurso', verifyJWT, (req, res) => {
  res.render('addRec');
});

// Rota para lidar com a adição de recurso
router.post('/adicionarRecurso', verifyJWT, upload.array('ficheiros', 10), async (req, res) => {
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
      let oldPath = file.path;
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
    if (!req.user || !req.user.id) {
      return res.status(400).send('Usuário não autenticado.');
    }
    
    const userId = req.user.id;

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
    const savedResource = await resource.save();

    // Adiciona o ID do recurso à lista de recursos do usuário logado
    await User.findByIdAndUpdate(userId, { $push: { myResources: savedResource._id.toString() } });

    res.redirect(`/resource/${savedResource._id}`); // Redireciona para a página do recurso recém-criado
  } catch (err) {
    console.error('Erro ao salvar o recurso:', err);
    res.status(500).send('Erro ao salvar o recurso.');
  }
});


// Rota para alternar status de admin usando POST
router.post('/users/:id/toggle-admin', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    // Alternar status de admin
    user.admin = !user.admin;
    await user.save();

    res.redirect('/users'); // Redirecionar para a lista de usuários
  } catch (err) {
    console.error('Erro ao atualizar status de admin:', err);
    res.status(500).send('Erro ao atualizar status de admin');
  }
});

// Rota para exclusão de usuário usando POST
router.post('/users/:id/delete', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.redirect('/users'); // Redirecionar para a lista de usuários
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).send('Erro ao deletar usuário');
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

// Rota para exibir o formulário de criação de comunicado
router.get('/comunicados/criar', verifyJWT, (req, res) => {
  res.render('criarComunicado');
});

router.post('/comunicados', verifyJWT, async (req, res) => {
  try {
    const { title, subtitle, content } = req.body;
    const author = req.user._id; // ID do autor do comunicado

    const comunicado = new Comunicado({
      title,
      subtitle,
      content,
      author,
      date: new Date()
    });

    const savedComunicado = await comunicado.save();

    res.redirect(`/comunicados/${savedComunicado._id}`);
  } catch (err) {
    console.error('Erro ao criar comunicado:', err);
    res.status(500).send('Erro ao criar comunicado');
  }
});

router.get('/comunicados/:id', async (req, res) => {
  try {
    const comunicado = await Comunicado.findById(req.params.id);
    if (!comunicado) {
      return res.status(404).send('Comunicado não encontrado');
    }
    res.render('comunicado', { comunicado });
  } catch (err) {
    console.error('Erro ao buscar comunicado:', err);
    res.status(500).send('Erro ao buscar comunicado');
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

router.post('/rate', async (req, res) => {
  const { resourceId, stars } = req.body;
  const email = req.user.email;

  const user = await User.findOne({ email }).exec();
  const userId = user._id;

  console.log('Recebendo avaliação:', { resourceId, stars, userId });

  try {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      console.error('Recurso não encontrado:', resourceId);
      return res.status(404).json({ success: false, error: 'Recurso não encontrado' });
    }

    const existingReview = resource.reviews.find(review => review.userId.equals(userId));
    if (existingReview) {
      existingReview.stars = stars;
      console.log('Atualizando avaliação existente:', existingReview);
    } else {
      resource.reviews.push({ userId, stars });
      console.log('Adicionando nova avaliação:', { userId, stars });
    }

    await resource.save();
    console.log('Avaliação salva com sucesso');
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).json({ success: false, error: 'Erro ao avaliar o recurso' });
  }
});

module.exports = router;