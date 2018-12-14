// node package imports
const path = require('path');
const fs = require('fs');
// npm install imports
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const graphqlHttp = require('express-graphql');
// custom imports
const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

//redirect the routes (removed for GraphQL)
// app.use('/feed', feedRoutes);
// app.use('/auth', authRoutes);
app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not Authenticated');
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res
    .status(201)
    .json({ message: 'File stored', filePath: req.file.path });
});

//GraphQL Middleware
app.use(
  '/graphql',
  graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error occured';
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    }
  })
);

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
    //   const server = app.listen(8080);
    //   const io = require('./socket').init(server);
    //   io.on('connection', socket => {
    //     console.log('Client connected');
    //   });
  })
  .catch(err => console.log(err));

//Helper Functions
const clearImage = filePath => {
  filePath = path.join(__dirname, filePath);
  fs.unlink(filePath, err => console.log(err));
};
