//npm install imports
const express = require('express');
const { body } = require('express-validator/check');

//custom imports
const feedCtrl = require('../controllers/feed');
const isAuth = require('../middleware/is-auth')

//set up the router
const router = express.Router();

//GET to /feed/posts (all posts)
router.get('/posts', isAuth, feedCtrl.getPosts);

//Get to /feed/post (single post)
router.get('/post/:postId', isAuth,feedCtrl.getPost);

//POST to /feed/post (create a post)
router.post(
  '/post',isAuth,
  [
    body('title')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Title is too short, needs to be 5 or more Characters'),
    body('content')
      .trim()
      .isLength({ min: 5 })
      .withMessage(
        'Post content is too short. Needs to be 5 or more Characters'
      )
  ],
  feedCtrl.createPost
);

//PUT to /feed/post/:postId (single post edit/update)
router.put(
  '/post/:postId',isAuth,
  [
    body('title')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Title is too short, needs to be 5 or more Characters'),
    body('content')
      .trim()
      .isLength({ min: 5 })
      .withMessage(
        'Post content is too short. Needs to be 5 or more Characters'
      )
  ],
  feedCtrl.updatePost
);

//DELETE to /feed/post/:postId (single post delete)
router.delete('/post/:postId',isAuth, feedCtrl.deletePost);

//export the routes
module.exports = router;
