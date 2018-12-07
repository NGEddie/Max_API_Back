// Logic for the GET /feed/posts route
exports.getPosts = (req, res, next) => {
	res.status(200).json({
		posts : [
			{ title: 'First Post', content: 'This is the first post' }
		]
	});
};

// Logic for POST /feed/post route
exports.createPost = (req, res, next) => {
	const title = req.body.title;
	const content = req.body.content;

	res.status(201).json({
		message : 'Post created successfully',
		post    : {
			id      : new Date().toISOString(),
			title   : title,
			content : content
		}
	});
};
