// node package imports

// npm install imports
const express = require('express');
const bodyParser = require('body-parser');

// custom imports
const feedRoutes = require('./routes/feed');

//create server
const app = express();

//*** Middleware ***/
//set up body parser for JSON
app.use(bodyParser.json());

//Set up middleware to allow CORS
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, PATCH, DELETE'
	);
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorisation'
	);
	next();
});

//redirect the routes
app.use('/feed', feedRoutes);

//set server port
app.listen(8080);
