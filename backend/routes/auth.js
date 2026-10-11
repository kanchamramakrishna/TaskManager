const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");

const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback"
  );
};


// ==========================================
// REGISTER
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "Account created successfully",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        googleConnected: !!user.googleId,
      },
    });

  } catch (error) {

    console.error(
      "Registration error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ==========================================
// LOGIN
// ==========================================

router.post("/login", async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create token
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        googleConnected: !!user.googleId,
      },
    });

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ==========================================
// GOOGLE OAUTH INITIATE
// ==========================================

router.get("/google", (req, res) => {
  const { state } = req.query;
  const client = getOAuthClient();
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar"
  ];

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: state
  });

  res.redirect(url);
});


// ==========================================
// GOOGLE OAUTH CALLBACK
// ==========================================

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  const client = getOAuthClient();

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfoResponse = await oauth2.userinfo.get();
    const userInfo = userInfoResponse.data;

    const googleId = userInfo.id;
    const email = userInfo.email;
    const name = userInfo.name;

    let user;

    if (state) {
      try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        user = await User.findById(decoded.userId);
      } catch (err) {
        console.error("JWT verify failed on google OAuth state:", err);
      }
    }

    if (user) {
      user.googleId = googleId;
    } else {
      user = await User.findOne({ googleId });
      if (!user) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          user.googleId = googleId;
        } else {
          user = new User({
            name,
            email: email.toLowerCase(),
            googleId,
            password: await bcrypt.hash(Math.random().toString(36), 10)
          });
        }
      }
    }

    user.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const userParam = encodeURIComponent(JSON.stringify({
      id: user._id,
      name: user.name,
      email: user.email,
      googleConnected: true
    }));

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/?token=${token}&user=${userParam}`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent("Google authentication failed")}`);
  }
});


// ==========================================
// GOOGLE DISCONNECT
// ==========================================

router.post("/google/disconnect", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.googleId = null;
    user.googleAccessToken = null;
    user.googleRefreshToken = null;
    await user.save();

    res.json({
      message: "Google account disconnected successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        googleConnected: false
      }
    });
  } catch (error) {
    console.error("Disconnect error:", error);
    res.status(500).json({ message: "Failed to disconnect Google account" });
  }
});


module.exports = router;