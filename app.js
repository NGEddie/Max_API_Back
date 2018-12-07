// node package imports

// npm install imports
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// custom imports
const feedRoutes = require('./routes/feed');

//MongoDB connection details
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env
	.MONGO_PW}@${process.env.MONGO_CLUSTER}/${process.env.MONGO_DATABASE}`;

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
// app.listen(8080);

//Connect to database and set server port
mongoose
	.connect(MONGODB_URI)
	.then(() => {
		console.log('Connected to MongoDb');
		app.listen(8080);
	})
	.catch((err) => console.log(err));
