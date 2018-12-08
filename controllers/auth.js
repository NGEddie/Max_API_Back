//import npm packages
const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//import custom modules
const User = require('../models/user');

//Logic for Signup new user
exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  //check for errors
  if (!errors.isEmpty()) {
    const error = new Error(`Validation Failed: ${errors.array()[0].msg}`);
    error.data = errors.array();
    throw error;
  }

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  //hash password
  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      //create user
      const user = new User({
        email: email,
        name: name,
        password: hashedPassword
      });
      //save user to database
      return user.save();
    })
    .then(result => {
      res.status(201).json({ message: 'User Creaated', userId: result._id });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//Logic for loging in a user
exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  console.log(email, password);
  
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error('Incorrect Username/Password');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString()
        },
        'ApolloWasFiftyYearsAgo',
        { expiresIn: '1hr' }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
