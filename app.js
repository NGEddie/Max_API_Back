// node package imports
const path = require('path');
// npm install imports
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
// custom imports
const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

//MongoDB connection details
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${
  process.env.MONGO_PW
}@${process.env.MONGO_CLUSTER}/${process.env.MONGO_DATABASE}`;

//create server
const app = express();
//configure Multer settings
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//*** Middleware ***/
//set up body parser for JSON
app.use(bodyParser.json());
//set up Multer
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
//set up static serving
app.use('/images', express.static(path.join(__dirname, 'images')));

//Set up middleware to allow CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorisation');
  next();
});

//redirect the routes
app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

//Add Error Handler
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({
    message: message,
    data: data
  });
});

//Connect to database and set server port
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDb');
    app.listen(8080);
  })
  .catch(err => console.log(err));
