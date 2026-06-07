const passport = require('passport');
const User = require('../models/User');
const googleStrategy = require('./oauth');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Register strategies when available
if (googleStrategy) {
  passport.use(googleStrategy);
}

module.exports = passport;
