//npm install imports
const { validationResult } = require('express-validator/check');

//require custom imports
const Post = require('../models/post');

// Logic for the GET /feed/posts route (get all posts)
exports.getPosts = (req, res, next) => {
  //get all posts from Db
  Post.find()
    .then(posts => {
      //return the posts
      res.status(200).json({
        message: 'Fetched post successfully',
        posts: posts,
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//Logic for GET /feed/post route (get a single post details)
exports.getPost = (req, res, next) => {
  //Extract post Id
  const postId = req.params.postId;

  //retrieve post from DB
  Post.findById(postId)
    .then(post => {
      //if check if post found
      if (!post) {
        const error = new Error('Could not find post in database');
        error.statusCode = 404;
        throw error;
      }
      //If post found, return data
      res.status(200).json({
        message: 'Post Fetched',
        post: post,
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// Logic for POST /feed/post route (create a post)
exports.createPost = (req, res, next) => {
  const errors = validationResult(req);
  console.log(req.body, req.file);
  if (!errors.isEmpty()) {
    const error = new Error(`Error: ${errors.array()[0].msg}`);
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error('No image found');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path;

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: {
      name: 'Bob',
    },
  });

  post
    .save()
    .then(post => {
      res.status(201).json({
        message: 'Post created successfully',
        post: post,
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
