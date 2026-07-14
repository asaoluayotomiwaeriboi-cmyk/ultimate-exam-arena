const User = require('../models/User');

let googleStrategy = null;
const googleClientID = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL?.trim();

if (googleClientID && googleClientSecret && googleCallbackURL) {
  try {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;
    googleStrategy = new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists by Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // Update existing user with latest Google data
            user.googleId = profile.id;
            user.googleAccessToken = accessToken;
            user.googleRefreshToken = refreshToken;
            user.lastLogin = Date.now();
            await user.save();
            return done(null, user);
          }

          // Check if user exists by email
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.googleAccessToken = accessToken;
            user.googleRefreshToken = refreshToken;
            user.lastLogin = Date.now();
            await user.save();
            return done(null, user);
          }

          // Create new user from Google profile
          const newUser = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: null, // OAuth users don't have password
            googleId: profile.id,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            role: 'student',
            profile: {
              avatar: profile.photos[0]?.value,
              provider: 'google',
            },
          });

          done(null, newUser);
        } catch (error) {
          done(error, null);
        }
      }
    );
  } catch (error) {
    console.warn('Google OAuth strategy could not be initialized:', error.message);
    googleStrategy = null;
  }
} else {
  console.warn('Google OAuth is not configured. Skipping google strategy registration.');
}

module.exports = googleStrategy;
