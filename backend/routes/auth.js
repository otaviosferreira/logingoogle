const express = require("express");
const crypto = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const { verifyGoogleIdToken } = require("../services/googleAuth");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();
const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

function requireDatabase(req, res, next) {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "Configure DATABASE_URL para habilitar sessões persistentes em produção." });
  }
  next();
}

router.post("/auth/google", requireDatabase, async (req, res, next) => {
  try {
    const user = await verifyGoogleIdToken(req.body?.credential);
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.user = user;
    req.session.authenticatedAt = new Date().toISOString();
    res.json({ authenticated: true, user });
  } catch (error) { next(error); }
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ authenticated: true, user: req.session.user, authenticatedAt: req.session.authenticatedAt });
});

router.post("/auth/logout", requireAuth, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("login_google.sid", {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/"
    });
    res.status(200).json({ authenticated: false });
  });
});

// Authorization Code + state + PKCE S256. O access token é usado no servidor.
router.get("/oauth/start", requireDatabase, (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(503).send("Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.");
  }
  (async () => {
    const state = crypto.randomBytes(32).toString("hex");
    const { codeVerifier, codeChallenge } = await oauthClient.generateCodeVerifierAsync();
    req.session.oauthState = state;
    req.session.codeVerifier = codeVerifier;
    const url = oauthClient.generateAuthUrl({
      access_type: "offline", prompt: "consent",
      scope: ["openid", "email", "profile"], state,
      code_challenge: codeChallenge, code_challenge_method: "S256"
    });
    res.redirect(url);
  })().catch(next);
});

router.get("/oauth/callback", requireDatabase, async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const received = Buffer.from(String(state || ""));
    const expected = Buffer.from(String(req.session.oauthState || ""));
    if (!code || !state || !req.session.oauthState ||
        received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return res.status(400).send("State OAuth inválido. Tente iniciar novamente.");
    }
    const { tokens } = await oauthClient.getToken({
      code: String(code), codeVerifier: req.session.codeVerifier,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });
    const identityTicket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID
    });
    const identity = identityTicket.getPayload();
    if (!identity?.sub) return res.status(401).send("Identidade não validada.");

    // Demonstra o uso do access token para consultar a API UserInfo autorizada.
    const userInfoClient = new OAuth2Client();
    userInfoClient.setCredentials({ access_token: tokens.access_token });
    const { data: userInfo } = await userInfoClient.request({
      url: "https://www.googleapis.com/oauth2/v3/userinfo"
    });
    if (!userInfo?.sub || userInfo.sub !== identity.sub) {
      return res.status(401).send("A identidade retornada pela API não corresponde ao ID token.");
    }

    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.user = {
      googleId: identity.sub,
      name: userInfo.name || identity.name || "Usuário Google",
      email: userInfo.email || identity.email,
      picture: userInfo.picture || identity.picture || null
    };
    req.session.authenticatedAt = new Date().toISOString();
    res.redirect("/?oauth=success#login");
  } catch (error) { next(error); }
});

module.exports = router;
