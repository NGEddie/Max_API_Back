const User = require('../models/user');
const Post = require('../models/post');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

module.exports = {
  createUser: async function({ userInput }, req) {
    const errors = [];
    //check validation using validator
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: 'Email is invalid' });
    }
    //check validation length of password
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short' });
    }
    //if any errors throw error
    if (errors.length > 0) {
      const error = new Error('Invaid Input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error('User exists already');
      throw error;
    }

    const hashedPassword = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPassword
    });

    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function({ email, password }) {
    //find user
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error('User not Found');
      error.code = 401;
      throw error;
    }

    //check password matches
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Incorrect Password');
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      'apollowasfiftyyearsago',
      { expiresIn: '1hr' }
    );

    return { token: token, userId: user._id.toString() };
  },
  createPost: async function({ postInput }, req) {
    //check if user is authorised to post
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }
    const errors = [];
    //check title validation
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is too short' });
    }
    //check content validation
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: 'Content is too short' });
    }
    //if any errors throw error
    if (errors.length > 0) {
      const error = new Error('Invaid Input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    //get User
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not Found');
      error.code = 401;
      throw error;
    }

    //create the post
    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user
    });
    //save post to db
    const createdPost = await post.save();

    //add posts to users post
    user.posts.push(createdPost);

    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString()
    };
  },
  getPosts: async function({ page }, req) {
    //check if user is authorised
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }

    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');

    return {
      posts: posts.map(post => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        };
      }),
      totalPosts: totalPosts
    };
  },
  getPost: async function({ postId }, req) {
    //check if user is authorised
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('No Post Found');
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  },
  editPost: async function({ postId, postInput }, req) {
    //check if user is authorised
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('Post Not Found');
      error.code = 404;
      throw error;
    }
    //check if user is the creator of the post
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not authorised');
      error.code = 403;
      throw error;
    }
    //check title validation
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is too short' });
    }
    //check content validation
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: 'Content is too short' });
    }
    //if any errors throw error
    if (errors.length > 0) {
      const error = new Error('Invaid Input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    //edit the post
    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== 'undefined') {
      post.imageUrl = postInput.imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString()
    };
  },
  deletePost: async function({ postId }, req) {
    //check if user is authorised
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId);

    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error('Not authorised to delete this post');
      error.code = 403;
      throw error;
    }
    //delete image
    clearImage(post.imageUrl);

    //delete post from DB
    await Post.findByIdAndDelete(postId);

    //delete post from users list
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();

    return true;
  },
  getUser: async function(args, req) {
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('User not found');
      error.code = 404;
      throw error;
    }

    return {
      ...user._doc,
      _id: user._id.toString()
    };
  },
  editStatus: async function({ newStatus }, req) {
    if (!req.isAuth) {
      const error = new Error('Authentication Failed');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 404;
      throw error;
    }

    user.status = newStatus;
    await user.save();
    return true;
  }
};
//Helper Functions
const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
