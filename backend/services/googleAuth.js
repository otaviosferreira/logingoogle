const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const error = new Error("GOOGLE_CLIENT_ID não configurado no servidor.");
    error.status = 503;
    throw error;
  }
  if (typeof idToken !== "string" || idToken.length > 10000) {
    const error = new Error("Credencial Google inválida.");
    error.status = 400;
    throw error;
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
    const error = new Error("A conta Google não possui os dados verificados necessários.");
    error.status = 401;
    throw error;
  }

  return {
    googleId: payload.sub,
    name: payload.name || payload.given_name || "Usuário Google",
    email: payload.email,
    picture: payload.picture || null
  };
}

module.exports = { verifyGoogleIdToken };
