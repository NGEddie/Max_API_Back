//node imports
const fs = require('fs');
const path = require('path');

//npm install imports
const { validationResult } = require('express-validator/check');

//require custom imports
const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

// Logic for the GET /feed/posts route (get all posts)
exports.getPosts = async (req, res, next) => {
  try {
    //get current page
    const currentPage = req.query.page || 1;
    const perPage = 2;

    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: 'Fetched post successfully',
      posts: posts,
      totalItems: totalItems
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//Logic for GET /feed/post route (get a single post details)
exports.getPost = async (req, res, next) => {
  try {
    //Extract post Id
    const postId = req.params.postId;

    //retrieve post from DB
    const post = await Post.findById(postId).populate('creator');
    console.log(post);

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
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Logic for POST /feed/post route (create a post)
exports.createPost = async (req, res, next) => {
  try {
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
    const savedPost = await post.save();
    //get user of post
    creator = await User.findById(req.userId);
    //add post to users list of posts
    creator.posts.push(post);
    const savedUser = await creator.save();

    //set up socket for updating post
    io.getIO().emit('posts', {
      action: 'create',
      post: { ...post._doc, creator: { _id: req.userId, name: savedUser.name } }
    });
    //return success message with post and user details
    res.status(201).json({
      message: 'Post created successfully',
      post: post,
      creator: { _id: creator._id, name: creator.name }
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Logic for PUT /feed/post route (edit an existing post)
exports.updatePost = async (req, res, next) => {
  try {
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
    const post = await Post.findById(postId).populate('creator');

    //check if post exisits
    if (!post) {
      const error = new Error('Could not find post in database');
      error.statusCode = 404;
      throw error;
    }

    //check post belongs to logged in user
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorised to update post');
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

    //save updated post to db
    const savedPost = await post.save();
    //add socket for updated posts
    io.getIO().emit('posts', { action: 'update', post: savedPost });
    //send succesful response
    res.status(200).json({ message: 'Post Updated', post: savedPost });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId);
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
    const removedPost = await Post.findOneAndRemove(postId);
    const user = await User.findById(req.userId);
    //delete post listing from users post array
    user.posts.pull(postId);
    //save updated user to db
    const updatedUser = user.save();

    io.getIO().emit('posts', { action: 'delete', post: postId });
    //respond success
    res.status(200).json({ message: 'Post Deleted' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    //Check user has been found
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }
    //respond success
    res.status(200).json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    //Check for Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error(`Error: ${errors.array()[0].msg}`);
      error.statusCode = 422;
      throw error;
    }

    const newStatus = req.body.status;
    userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }
    //update status for user
    user.status = newStatus;
    //save back to database
    const savedUser = await user.save();
    //return success message
    res.status(200).json({ message: 'status updated' });
  } catch (error) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//**** HELPER FUNCTIONS *****/
//clear image helper function
const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
