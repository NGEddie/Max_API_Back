//npm install imports
const express = require('express');
const {
  body
} = require('express-validator/check');

//custom imports
const feedCtrl = require('../controllers/feed');

//set up the router
const router = express.Router();

//GET to /feed/posts (all posts)
router.get('/posts', feedCtrl.getPosts);

//Get to /feed/post (single post)
router.get('/post/:postId', feedCtrl.getPost);

//POST to /feed/post (create a post)
router.post(
  '/post',
  [
    body('title').trim().isLength({
      min: 5
    }).withMessage('Title is too short, needs to be 5 or more Characters'),
    body('content')
    .trim()
    .isLength({
      min: 5
    })
    .withMessage('Post content is too short. Needs to be 5 or more Characters')
  ],
  feedCtrl.createPost
);

//export the routes
module.exports = router;