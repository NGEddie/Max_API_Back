//for graphQL

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  //get authorization header
  const authHeader = req.get('Authorization');

  //check if it exisits
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }

  // get the JWT from header
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    //decode and verify token
    decodedToken = jwt.verify(token, 'apollowasfiftyyearsago');
  } catch (error) {
    req.isAuth = false;
    return next();
  }

  //check if it is a valid token
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }
  //get userId from token
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
