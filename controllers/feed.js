//npm install imports
const { validationResult } = require('express-validator/check');

//require custom imports
const Post = require('../models/post');

// Logic for the GET /feed/posts route
exports.getPosts = (req, res, next) => {
	res.status(200).json({
		posts : [
			{
				_id       : '001',
				title     : 'First Post',
				content   : 'This is the first post',
				imageUrl  : 'images/mouse.jpg',
				creator   : {
					name : 'bob'
				},
				createdAt : new Date()
			}
		]
	});
};

// Logic for POST /feed/post route
exports.createPost = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(422).json({
			message : 'Validation failed, entered data is incorrect.',
			errors  : errors.array()
		});
	}
	const title = req.body.title;
	const content = req.body.content;

	const post = new Post({
		title    : title,
		content  : content,
		imageUrl : 'a url',
		creator  : { name: 'Bob' }
	});
	post
		.save()
		.then((post) => {
			res.status(201).json({
				message : 'Post created successfully',
				post    : post
			});
		})
		.catch((err) => console.log(err));
};
