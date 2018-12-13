//import npm packages
const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//import custom modules
const User = require('../models/user');

//Logic for Signup new user
exports.signup = async (req, res, next) => {
  try {
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
    const hashedPassword = await bcrypt.hash(password, 12);
    //create user
    const user = new User({
      email: email,
      name: name,
      password: hashedPassword
    });

    //save user to database
    const savedUser = await user.save();
    //return success
    res.status(201).json({ message: 'User Creaated', userId: savedUser._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//Logic for loging in a user
exports.login = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;

    const user = await User.findOne({ email: email });
    //check if user exists
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }
    loadedUser = user;

    //check if password is correct
    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error('Incorrect Username/Password');
      error.statusCode = 401;
      throw error;
    }
    //assign a token if password was correct
    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString()
      },
      'ApolloWasFiftyYearsAgo',
      { expiresIn: '1hr' }
    );
    //respond with token and success
    res.status(200).json({ token: token, userId: loadedUser._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
