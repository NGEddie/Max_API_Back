//npm install imports
const express = require('express');

//custom imports
const feedCtrl = require('../controllers/feed');

//set up the routers
const router = express.Router();

//GET to /feed/posts
router.get('/posts', feedCtrl.getPosts);
//POST to /feed/post
router.post('/post', feedCtrl.createPost);

//export the routes
module.exports = router;
