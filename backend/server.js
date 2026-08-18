require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const { getAuthCookie } = require("./authCookie");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// Restore Salesforce authentication from the encrypted cookie
// when the request reaches a new Vercel serverless instance.
app.use((req, res, next) => {
  if (!req.session.sf) {
    const auth = getAuthCookie(req);

    if (auth) {
      req.session.sf = auth;
    }
  }

  next();
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/api", recordRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
