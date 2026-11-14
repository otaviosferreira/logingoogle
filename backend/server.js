require("dotenv").config({ path: process.env.ENV_FILE || "backend/.env" });
const express = require("express");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { Pool } = require("pg");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET precisa ser configurado em produção.");
}
const PgStore = connectPgSimple(session);
let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000
  });
}

app.set("trust proxy", 1);
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.APP_ORIGIN || "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "X-Requested-With"]
}));
app.use(express.json({ limit: "12kb" }));

// Vercel encaminha /api/* para esta função; localmente a API usa a mesma raiz.
app.use((req, res, next) => {
  if (req.url === "/api") req.url = "/";
  else if (req.url.startsWith("/api/")) req.url = req.url.slice(4);
  next();
});

const sessionOptions = {
  name: "login_google.sid",
  secret: process.env.SESSION_SECRET || "dev-only-change-me",
  resave: false, saveUninitialized: false, rolling: true,
  cookie: {
    httpOnly: true, secure: isProduction, sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8, path: "/"
  }
};
if (pool) {
  sessionOptions.store = new PgStore({
    pool, tableName: "user_sessions", createTableIfMissing: true,
    pruneSessionInterval: 15 * 60
  });
}
app.use(session(sessionOptions));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  standardHeaders: "draft-7", legacyHeaders: false
});
app.use("/auth", authLimiter);
app.use("/oauth", authLimiter);

// Mutating requests require the expected origin and a custom header (CSRF defense).
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const expected = process.env.APP_ORIGIN || "http://localhost:3000";
  if (req.get("origin") !== expected) return res.status(403).json({ error: "Origem não autorizada." });
  if (req.get("x-requested-with") !== "XMLHttpRequest") {
    return res.status(403).json({ error: "Cabeçalho de proteção CSRF ausente." });
  }
  next();
});

app.get("/config", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});
app.get("/health", (req, res) => res.json({
  status: "ok",
  sessionStore: pool ? "postgresql" : "memory-local-only",
  googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID)
}));
app.use("/", authRoutes);

app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  const status = Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: status === 500 ? "Erro interno do servidor." : err.message });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => console.log(`API Login Google disponível em http://localhost:${port}`));
}
module.exports = app;
