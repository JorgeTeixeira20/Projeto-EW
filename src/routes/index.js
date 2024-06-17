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

function calculateLevel(xp) {
  let level = 1;
  let xpThreshold = 100;

  while (xp >= xpThreshold) {
    level += 1;
    xp -= xpThreshold;
  }

  return level;
}

router.get('/', verifyJWT, setUser, async (req, res) => {
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
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    res.render('main', { items });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar posts, recursos e comunicados.');
  }
});

router.get('/listaRecursos', async (req, res) => {
  const searchQuery = req.query.search;
  const filterYear = req.query.year;
  const filterTheme = req.query.theme;
  const filterType = req.query.type;

  let query = {};

  if (searchQuery) {
    query.title = { $regex: searchQuery, $options: 'i' };
  }

  if (filterYear) {
    query.year = filterYear;
  }

  if (filterTheme) {
    query.themes = { $regex: filterTheme, $options: 'i' };
  }

  if (filterType) {
    query.type = { $regex: filterType, $options: 'i' };
  }

  try {
    const resources = await Resource.find(query);
    res.render('listaRecursos', { resources });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recursos');
  }
});


router.get('/listaPosts', async (req, res) => {
  try {
    const searchQuery = req.query.search;
    let posts;

    if (searchQuery) {
      posts = await Post.find({
        title: { $regex: searchQuery, $options: 'i' }
      }).lean();
    } else {
      posts = await Post.find({}).lean();
    }

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
router.get('/post/:id', verifyJWT, setUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send('Usuário não autenticado');
    }
    const post = await Post.findById(req.params.id).lean();
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const resource = await Resource.findById(post.resourceId).lean();
    if (!resource) {
      return res.status(404).send('Resource não encontrado');
    }

    const author = await User.findById(post.userId).lean();
    if (!author) {
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
      map[user._id] = {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      };
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
    console.log('Author encontrado:', author);
    console.log('Usuário logado:', req.user); // Log do usuário logado
    console.log('req.user.id:', req.user.id); // Log do id do usuário logado
    console.log('post.userId:', post.userId); // Log do userId do post
    console.log('req.user.admin:', req.user.admin); // Log do campo admin do usuário logado

    // Verificar se o usuário logado é o dono do post ou um administrador
    const user = req.user;
    const isOwner = user && post.userId && user.id && (post.userId.toString() === user.id.toString());
    const isAdmin = user && user.admin;

    console.log('isOwner:', isOwner); // Log do isOwner
    console.log('isAdmin:', isAdmin); // Log do isAdmin

    res.render('post', { post, resource, user, isOwner, isAdmin, author });
  } catch (err) {
    console.error('Erro ao buscar post:', err); // Log detalhado do erro
    res.status(500).send('Erro ao buscar post');
  }
});


router.delete('/post/:id', verifyJWT, setUser, async (req, res) => {
  try {
    const postId = req.params.id;

    // Verifique se o post existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    // Verifique se o usuário é o dono do post ou um administrador
    const user = req.user;
    const isOwner = user && post.userId && user.id && (post.userId.toString() === user.id.toString());
    const isAdmin = user && user.admin;

    if (!isOwner && !isAdmin) {
      return res.status(403).send('Permissão negada');
    }

    // Delete o post
    await Post.findByIdAndDelete(postId);

    res.status(200).send('Post deletado com sucesso');
  } catch (err) {
    console.error('Erro ao deletar post:', err);
    res.status(500).send('Erro ao deletar post');
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

    // Incrementar XP do usuário
    const user = await User.findById(req.user.id);
    user.xp += 10; // XP por adicionar comentário
    user.level = calculateLevel(user.xp);
    await user.save();

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

    // Incrementar XP do usuário
    const user = await User.findById(req.user.id);
    user.xp += 5; // XP por adicionar resposta
    user.level = calculateLevel(user.xp);
    await user.save();

    res.redirect(`/post/${req.params.id}`);
  } catch (err) {
    console.error('Erro ao adicionar resposta:', err);
    res.status(500).send('Erro ao adicionar resposta');
  }
});

// Route to handle voting on posts
router.post('/post/:id/vote', verifyJWT, async (req, res) => {
  const { type } = req.body; // 'upvote' or 'downvote'
  const userId = req.user.id;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const existingVote = post.votes.details.find(vote => vote.userId === userId);

    if (existingVote) {
      // User is changing their vote
      if (existingVote.type === type) {
        // User is removing their vote
        post.votes.count += (type === 'upvote' ? -1 : 1);
        post.votes.details = post.votes.details.filter(vote => vote.userId !== userId);
      } else {
        // User is switching their vote
        post.votes.count += (type === 'upvote' ? 2 : -2);
        existingVote.type = type;
      }
    } else {
      // User is voting for the first time
      post.votes.count += (type === 'upvote' ? 1 : -1);
      post.votes.details.push({ userId, type });
    }

    await post.save();
    res.json({ success: true, votes: post.votes });
  } catch (err) {
    console.error('Erro ao votar no post:', err);
    res.status(500).send('Erro ao votar no post');
  }
});

// Route to handle voting on comments
router.post('/post/:postId/comment/:commentId/vote', verifyJWT, async (req, res) => {
  const { type } = req.body; // 'upvote' or 'downvote'
  const userId = req.user.id;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).send('Comentário não encontrado');
    }

    const existingVote = comment.votes.details.find(vote => vote.userId === userId);

    if (existingVote) {
      // User is changing their vote
      if (existingVote.type === type) {
        // User is removing their vote
        comment.votes.count += (type === 'upvote' ? -1 : 1);
        comment.votes.details = comment.votes.details.filter(vote => vote.userId !== userId);
      } else {
        // User is switching their vote
        comment.votes.count += (type === 'upvote' ? 2 : -2);
        existingVote.type = type;
      }
    } else {
      // User is voting for the first time
      comment.votes.count += (type === 'upvote' ? 1 : -1);
      comment.votes.details.push({ userId, type });
    }

    await post.save();
    res.json({ success: true, votes: comment.votes });
  } catch (err) {
    console.error('Erro ao votar no comentário:', err);
    res.status(500).send('Erro ao votar no comentário');
  }
});

// Route to handle voting on replies
router.post('/post/:postId/comment/:commentId/reply/:replyId/vote', verifyJWT, async (req, res) => {
  const { type } = req.body; // 'upvote' or 'downvote'
  const userId = req.user.id;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).send('Comentário não encontrado');
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).send('Resposta não encontrada');
    }

    const existingVote = reply.votes.details.find(vote => vote.userId === userId);

    if (existingVote) {
      // User is changing their vote
      if (existingVote.type === type) {
        // User is removing their vote
        reply.votes.count += (type === 'upvote' ? -1 : 1);
        reply.votes.details = reply.votes.details.filter(vote => vote.userId !== userId);
      } else {
        // User is switching their vote
        reply.votes.count += (type === 'upvote' ? 2 : -2);
        existingVote.type = type;
      }
    } else {
      // User is voting for the first time
      reply.votes.count += (type === 'upvote' ? 1 : -1);
      reply.votes.details.push({ userId, type });
    }

    await post.save();
    res.json({ success: true, votes: reply.votes });
  } catch (err) {
    console.error('Erro ao votar na resposta:', err);
    res.status(500).send('Erro ao votar na resposta');
  }
});

// Route to handle voting on comments
router.post('/post/:postId/comment/:commentId/vote', verifyJWT, async (req, res) => {
  const { type } = req.body; // 'upvote' or 'downvote'
  const userId = req.user.id;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).send('Comentário não encontrado');
    }

    const existingVote = comment.votes.details.find(vote => vote.userId === userId);

    if (existingVote) {
      // User is changing their vote
      if (existingVote.type === type) {
        // User is removing their vote
        comment.votes.count += (type === 'upvote' ? -1 : 1);
        comment.votes.details = comment.votes.details.filter(vote => vote.userId !== userId);
      } else {
        // User is switching their vote
        comment.votes.count += (type === 'upvote' ? 2 : -2);
        existingVote.type = type;
      }
    } else {
      // User is voting for the first time
      comment.votes.count += (type === 'upvote' ? 1 : -1);
      comment.votes.details.push({ userId, type });
    }

    await post.save();
    res.json({ success: true, votes: comment.votes });
  } catch (err) {
    console.error('Erro ao votar no comentário:', err);
    res.status(500).send('Erro ao votar no comentário');
  }
});

// Route to handle voting on replies
router.post('/post/:postId/comment/:commentId/reply/:replyId/vote', verifyJWT, async (req, res) => {
  const { type } = req.body; // 'upvote' or 'downvote'
  const userId = req.user.id;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).send('Comentário não encontrado');
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).send('Resposta não encontrada');
    }

    const existingVote = reply.votes.details.find(vote => vote.userId === userId);

    if (existingVote) {
      // User is changing their vote
      if (existingVote.type === type) {
        // User is removing their vote
        reply.votes.count += (type === 'upvote' ? -1 : 1);
        reply.votes.details = reply.votes.details.filter(vote => vote.userId !== userId);
      } else {
        // User is switching their vote
        reply.votes.count += (type === 'upvote' ? 2 : -2);
        existingVote.type = type;
      }
    } else {
      // User is voting for the first time
      reply.votes.count += (type === 'upvote' ? 1 : -1);
      reply.votes.details.push({ userId, type });
    }

    await post.save();
    res.json({ success: true, votes: reply.votes });
  } catch (err) {
    console.error('Erro ao votar na resposta:', err);
    res.status(500).send('Erro ao votar na resposta');
  }
});

// Rota para deletar um comentário
router.delete('/post/:postId/comment/:commentId', verifyJWT, setUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const commentIndex = post.comments.findIndex(comment => comment._id.toString() === req.params.commentId);
    if (commentIndex === -1) {
      return res.status(404).send('Comentário não encontrado');
    }

    const comment = post.comments[commentIndex];

    // Verificar se o usuário logado é o dono do comentário ou um administrador
    if (req.user.id.toString() !== comment.commentUserId.toString() && !req.user.admin) {
      return res.status(403).send('Você não tem permissão para deletar este comentário');
    }

    // Remover o comentário do array de comentários
    post.comments.splice(commentIndex, 1);

    await post.save();

    res.status(200).send('Comentário deletado com sucesso');
  } catch (err) {
    console.error('Erro ao deletar comentário:', err);
    res.status(500).send('Erro ao deletar comentário');
  }
});


// Rota para deletar uma resposta
router.delete('/post/:postId/comment/:commentId/reply/:replyId', verifyJWT, setUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send('Post não encontrado');
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).send('Comentário não encontrado');
    }

    const replyIndex = comment.replies.findIndex(reply => reply._id.toString() === req.params.replyId);
    if (replyIndex === -1) {
      return res.status(404).send('Resposta não encontrada');
    }

    const reply = comment.replies[replyIndex];

    // Verificar se o usuário logado é o dono da resposta ou um administrador
    if (req.user.id.toString() !== reply.commentUserId.toString() && !req.user.admin) {
      return res.status(403).send('Você não tem permissão para deletar esta resposta');
    }

    // Remover a resposta do array de respostas
    comment.replies.splice(replyIndex, 1);

    await post.save();

    res.status(200).send('Resposta deletada com sucesso');
  } catch (err) {
    console.error('Erro ao deletar resposta:', err);
    res.status(500).send('Erro ao deletar resposta');
  }
});



router.get('/resource/:id', verifyJWT, setUser, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).lean();
    if (!resource) {
      return res.status(404).send('Resource não encontrado');
    }

    const creator = await User.findById(resource.user).lean();
    if (!creator) {
      return res.status(404).send('Criador não encontrado');
    }

    const user = req.user;
    const isOwner = user && resource.user && user.id && (resource.user.toString() === user.id.toString());
    const isAdmin = user && user.admin;

    res.render('recurso', { resource, user, isOwner, isAdmin, creator });
  } catch (err) {
    console.error('Erro ao buscar recurso:', err);
    res.status(500).send('Erro ao buscar recurso');
  }
});

router.delete('/resource/:id', verifyJWT, setUser, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).send('Recurso não encontrado');
    }

    const user = req.user;
    const isOwner = user && resource.user && user.id && (resource.user.toString() === user.id.toString());
    const isAdmin = user && user.admin;

    if (!isOwner && !isAdmin) {
      return res.status(403).send('Você não tem permissão para deletar este recurso');
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.status(200).send('Recurso deletado com sucesso');
  } catch (err) {
    console.error('Erro ao deletar recurso:', err);
    res.status(500).send('Erro ao deletar recurso');
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
    const user = await User.findById(req.user.id);
    user.myPosts.push(newPost._id);

    // Incrementar XP do usuário
    user.xp += 25; // XP por adicionar post
    user.level = calculateLevel(user.xp);
    await user.save();

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

// Rota para a página principal de rankings
router.get('/rankings', (req, res) => {
  res.render('rankings');
});

// Rota para o ranking dos recursos
router.get('/rankings/recursos', async (req, res) => {
  try {
    const resources = await Resource.find({});

    resources.forEach(resource => {
      const totalStars = resource.reviews.reduce((sum, review) => sum + review.stars, 0);
      resource.averageRating = resource.reviews.length > 0 ? (totalStars / resource.reviews.length) : 0;
    });

    resources.sort((a, b) => b.averageRating - a.averageRating);

    const topResources = resources.slice(0, 5);

    res.render('ranking-recursos', { topResources });
  } catch (err) {
    console.error('Erro ao buscar recursos para o ranking:', err);
    res.status(500).send('Erro ao buscar recursos para o ranking.');
  }
});

router.get('/rankings/level', async (req, res) => {
  try {
    const users = await User.find().lean();

    users.forEach(user => {
      user.level = calculateLevel(user.xp);
    });

    users.sort((a, b) => {
      if (b.level === a.level) {
        return b.xp - a.xp;
      }
      return b.level - a.level;
    });

    res.render('rankingsLevel', { users });
  } catch (err) {
    console.error('Erro ao buscar ranking de níveis dos usuários:', err);
    res.status(500).send('Erro ao buscar ranking de níveis dos usuários.');
  }
});

// Rota para o ranking dos usuários
router.get('/rankings/users', async (req, res) => {
  try {
    const resources = await Resource.find({});

    const userRatings = {};

    resources.forEach(resource => {
      if (!userRatings[resource.user]) {
        userRatings[resource.user] = { totalStars: 0, totalReviews: 0 };
      }
      userRatings[resource.user].totalStars += resource.reviews.reduce((sum, review) => sum + review.stars, 0);
      userRatings[resource.user].totalReviews += resource.reviews.length;
    });

    const userAverageRatings = Object.keys(userRatings).map(userId => {
      const { totalStars, totalReviews } = userRatings[userId];
      return {
        userId,
        averageRating: totalReviews > 0 ? totalStars / totalReviews : 0
      };
    });

    userAverageRatings.sort((a, b) => b.averageRating - a.averageRating);

    const topUsers = userAverageRatings.slice(0, 5);

    const topUserIds = topUsers.map(user => user.userId);
    const topUserDetails = await User.find({ _id: { $in: topUserIds } }).lean();

    const topUsersWithDetails = topUsers.map(user => {
      const userDetails = topUserDetails.find(u => u._id.toString() === user.userId);
      return {
        ...user,
        firstName: userDetails ? userDetails.firstName : 'Unknown',
        lastName: userDetails ? userDetails.lastName : 'User'
      };
    });

    res.render('ranking-users', { topUsers: topUsersWithDetails });
  } catch (err) {
    console.error('Erro ao buscar usuários para o ranking:', err);
    res.status(500).send('Erro ao buscar usuários para o ranking.');
  }
});

router.get('/meusrecursos', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const searchQuery = req.query.search;
    const filterYear = req.query.year;
    const filterTheme = req.query.theme;
    const filterType = req.query.type;
    const user = await User.findById(userId);
    const resourceIds = user.myResources;

    let query = { _id: { $in: resourceIds } };

    if (searchQuery) {
      query.title = { $regex: searchQuery, $options: 'i' };
    }

    if (filterYear) {
      query.year = filterYear;
    }

    if (filterTheme) {
      query.themes = { $regex: filterTheme, $options: 'i' };
    }

    if (filterType) {
      query.type = { $regex: filterType, $options: 'i' };
    }

    const resources = await Resource.find(query);

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
    const searchQuery = req.query.search;
    const user = await User.findById(userId).populate('myPosts');
    const postIds = user.myPosts;

    let posts;
    if (searchQuery) {
      posts = await Post.find({
        _id: { $in: postIds },
        title: { $regex: searchQuery, $options: 'i' }
      });
    } else {
      posts = await Post.find({ _id: { $in: postIds } });
    }

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

    const user = await User.findById(userId);
    user.xp += 50; // XP por adicionar recurso
    user.level = calculateLevel(user.xp);
    await user.save();
    console.log("XP");
    console.log(user.xp);
    console.log("LEVEL");
    console.log(calculateLevel(user.xp));

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

router.post('/comunicados', verifyJWT, setUser, async (req, res) => {
  try {
    const { title, subtitle, content } = req.body;
    const author = req.user.id; // ID do autor do comunicado

    console.log("Author: " + author)

    const comunicado = new Comunicado({
      _id: new mongoose.Types.ObjectId().toString(),
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
    const comunicado = await Comunicado.findById(req.params.id).lean();
    if (!comunicado) {
      return res.status(404).send('Comunicado não encontrado');
    }
    res.render('comunicado', { comunicado, user: req.user });
  } catch (err) {
    console.error('Erro ao buscar comunicado:', err);
    res.status(500).send('Erro ao buscar comunicado');
  }
});

//Rota para eliminar um comunicado
router.delete('/comunicado/:id', verifyJWT, setUser, async (req, res) => {
  try {
    const comunicadoId = req.params.id;

    // Verifique se o comunicado existe
    const comunicado = await Comunicado.findById(comunicadoId);
    if (!comunicado) {
      return res.status(404).send('Comunicado não encontrado');
    }

    // Verifique se o usuário é um administrador
    if (!req.user.admin) {
      return res.status(403).send('Permissão negada');
    }

    // Delete o comunicado
    await Comunicado.findByIdAndDelete(comunicadoId);

    res.status(200).send('Comunicado deletado com sucesso');
  } catch (err) {
    console.error('Erro ao deletar comunicado:', err);
    res.status(500).send('Erro ao deletar comunicado');
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

router.post('/rate', verifyJWT, async (req, res) => {
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

    const user = await User.findById(req.user.id);
    user.xp += 5; // XP por adicionar avaliação
    user.level = calculateLevel(user.xp);
    await user.save();

    console.log('Avaliação salva com sucesso');
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).json({ success: false, error: 'Erro ao avaliar o recurso' });
  }
});

router.get('/upload-json', (req, res) => {
  res.render('upload-json');
});

router.post('/upload-json', upload.single('jsonFile'), async (req, res) => {
  try {
    if (req.file) {
      const filePath = req.file.path;
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      const dataType = req.body.dataType;
      
      switch (dataType) {
        case 'users':
          await User.insertMany(jsonData);
          break;
        case 'resources':
          await Resource.insertMany(jsonData);
          break;
        case 'posts':
          await Post.insertMany(jsonData);
          break;
        case 'comunicados':
          await Comunicado.insertMany(jsonData);
          break;
        default:
          throw new Error('Invalid data type specified');
      }

      // Deletar o arquivo após processar
      fs.unlinkSync(filePath);

      res.send('Dados carregados com sucesso!');
    } else {
      res.status(400).send('Nenhum arquivo enviado.');
    }
  } catch (error) {
    console.error('Erro ao processar o upload do JSON:', error);
    res.status(500).send('Erro ao processar o upload do JSON.');
  }
});

router.get('/download-jsons', async (req, res) => {
  try {
    const users = await User.find({}).lean();
    const resources = await Resource.find({}).lean();
    const posts = await Post.find({}).lean();
    const comunicados = await Comunicado.find({}).lean();

    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment('data.zip');

    archive.pipe(res);

    archive.append(JSON.stringify(users, null, 2), { name: 'users.json' });
    archive.append(JSON.stringify(resources, null, 2), { name: 'resources.json' });
    archive.append(JSON.stringify(posts, null, 2), { name: 'posts.json' });
    archive.append(JSON.stringify(comunicados, null, 2), { name: 'comunicados.json' });

    await archive.finalize();
  } catch (error) {
    console.error('Erro ao criar o arquivo ZIP:', error);
    res.status(500).send('Erro ao criar o arquivo ZIP.');
  }
});

module.exports = router;