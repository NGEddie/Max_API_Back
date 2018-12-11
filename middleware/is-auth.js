const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  //get authorization header
  const authHeader = req.get('Authorization');

  //check if it exisits
  if (!authHeader) {
    const error = new Error('Not Authenticated');
    error.statusCode = 401;
    throw error;
  }

  // get the JWT from header
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    //decode and verify token
    decodedToken = jwt.verify(token, 'ApolloWasFiftyYearsAgo');
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  //check if it is a valid token
  if (!decodedToken) {
    const error = new Error('Not Authenticated');
    error.statusCode = 401;
    throw error;
  }
  //get userId from token
  req.userId = decodedToken.userId;
  next();
};
