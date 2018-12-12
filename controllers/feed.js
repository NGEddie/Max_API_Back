//node imports
const fs = require('fs');
const path = require('path');

//npm install imports
const { validationResult } = require('express-validator/check');

//require custom imports
const Post = require('../models/post');
const User = require('../models/user');

// Logic for the GET /feed/posts route (get all posts)
exports.getPosts = (req, res, next) => {
  //get current page
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then(count => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then(posts => {
      //return the posts
      res.status(200).json({
        message: 'Fetched post successfully',
        posts: posts,
        totalItems: totalItems
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
        post: post
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
  let creator;

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId
  });

  //save Post to Database
  post
    .save()
    .then(result => User.findById(req.userId)) //get user of post
    .then(user => {
      //add post to users list of posts
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(user => {
      //return success message with post and user details
      res.status(201).json({
        message: 'Post created successfully',
        post: post,
        creator: { _id: creator._id, name: creator.name }
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// Logic for PUT /feed/post route (edit an existing post)
exports.updatePost = (req, res, next) => {
  //check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(`Error: ${errors.array()[0].msg}`);
    error.statusCode = 422;
    throw error;
  }

  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  //check for chosen image file, if it exists set the URL
  if (req.file) {
    imageUrl = req.file.path;
  }
  // if it doesn't then throw error
  if (!imageUrl) {
    const error = new Error('No file picked');
    error.status = 422;
    throw error;
  }

  //Update data in database
  Post.findById(postId)
    .then(post => {
      //check if post exisits
      if (!post) {
        const error = new Error('Could not find post in database');
        error.statusCode = 404;
        throw error;
      }
      //check post belongs to logged in user
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorised to view post');
        error.statusCode = 403;
        throw error;
      }

      //if image was a new image, delete the old one
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then(result => {
      res.status(200).json({ message: 'Post Updated', post: result });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      //check if post exisits
      if (!post) {
        const error = new Error('Could not find post in database');
        error.statusCode = 404;
        throw error;
      }
      //check post belongs to logged in user
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorised to view post');
        error.statusCode = 403;
        throw error;
      }

      //delete image from server
      clearImage(post.imageUrl);
      //delete post from database
      return Post.findOneAndRemove(postId);
    })
    .then(result => User.findById(req.userId))
    .then(user => {
      //delete post listing from users post array
      user.posts.pull(postId);
      return user.save();
    })
    .then(result => res.status(200).json({ message: 'Post Deleted' }))
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getStatus = (req, res, next) => {
  const userId = req.userId;

  User.findById(userId)
    .then(user => {
      //Check user has been found
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
      }

      res.status(200).json({ status: user.status });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateStatus = (req, res, next) => {
  //Check for Validation Errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(`Error: ${errors.array()[0].msg}`);
    error.statusCode = 422;
    throw error;
  }

  const newStatus = req.body.status;
  userId = req.userId;

  User.findById(userId)
    .then(user => {
      //Check user has been found
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
      }
      //update status for user
      user.status = newStatus;
      //save back to database
      return user.save();
    })
    .then(result => res.status(200).json({ message: 'status updated' })) //return success message
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//**** HELPER FUNCTIONS *****/
//clear image helper function
const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
