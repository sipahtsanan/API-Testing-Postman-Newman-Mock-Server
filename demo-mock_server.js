// server.js
// npm install express cors body-parser uuid

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuid } = require("uuid");

// ---------- Shared helpers ----------
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createTokenPair(ttlSec = 300) {
  const access = "access-" + uuid();
  const refresh = "refresh-" + uuid();
  const expiresAt = nowSeconds() + ttlSec;
  return { access, refresh, expiresAt, ttlSec };
}

// ---------- Service A (Users) ----------
const appA = express();
appA.use(cors());
appA.use(bodyParser.json());

const users = []; // in-memory
const tokensA = {}; // refreshToken -> { access, refresh, expiresAt }

function authMiddlewareA(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Missing access token" });

  // check that the token came from the refresh pair or others
  const valid = Object.values(tokensA).some((t) => t.access === token);
  if (!valid) {
    return res.status(401).json({ message: "Invalid access token" });
  }
  next();
}

// POST /auth/token - login initial
appA.post("/auth/token", (req, res) => {
  const { client_id, client_secret } = req.body || {};
  // demo: not check seriously
  if (!client_id || !client_secret) {
    return res.status(400).json({ message: "client_id and client_secret required" });
  }

  const pair = createTokenPair(300); // 5 minutes
  tokensA[pair.refresh] = pair;

  res.json({
    access_token: pair.access,
    refresh_token: pair.refresh,
    expires_in: pair.ttlSec,
    token_type: "Bearer"
  });
});

// POST /auth/refresh - use refresh token to get new access
appA.post("/auth/refresh", (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token || !tokensA[refresh_token]) {
    return res.status(400).json({ message: "Invalid refresh_token" });
  }

  const pair = tokensA[refresh_token];
  // Create the new access token (For using the ex-refresh or the new one here 'reuse refresh')
  const newAccess = "access-" + uuid();
  pair.access = newAccess;
  pair.expiresAt = nowSeconds() + pair.ttlSec;

  res.json({
    access_token: newAccess,
    refresh_token,
    expires_in: pair.ttlSec,
    token_type: "Bearer"
  });
});

// POST /users - create user (protected)
appA.post("/users", authMiddlewareA, (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ message: "name and email required" });
  }
  const id = users.length + 1;
  const user = { id, name, email, createdAt: new Date().toISOString() };
  users.push(user);
  res.status(201).json(user);
});

// GET /users/:id (protected)
appA.get("/users/:id", authMiddlewareA, (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

const PORT_A = 3001;
appA.listen(PORT_A, () => {
  console.log(`Service A (Users) running at http://localhost:${PORT_A}`);
});

// ---------- Service B (Orders) ----------
const appB = express();
appB.use(cors());
appB.use(bodyParser.json());

const orders = [];
const tokensB = {};

function authMiddlewareB(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Missing access token" });

  const valid = Object.values(tokensB).some((t) => t.access === token);
  if (!valid) {
    return res.status(401).json({ message: "Invalid access token" });
  }
  next();
}

// POST /auth/token - Service B token
appB.post("/auth/token", (req, res) => {
  const { client_id, client_secret } = req.body || {};
  if (!client_id || !client_secret) {
    return res.status(400).json({ message: "client_id and client_secret required" });
  }

  const pair = createTokenPair(300);
  tokensB[pair.refresh] = pair;

  res.json({
    access_token: pair.access,
    refresh_token: pair.refresh,
    expires_in: pair.ttlSec,
    token_type: "Bearer"
  });
});

// POST /auth/refresh - Service B refresh
appB.post("/auth/refresh", (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token || !tokensB[refresh_token]) {
    return res.status(400).json({ message: "Invalid refresh_token" });
  }
  const pair = tokensB[refresh_token];
  const newAccess = "access-" + uuid();
  pair.access = newAccess;
  pair.expiresAt = nowSeconds() + pair.ttlSec;

  res.json({
    access_token: newAccess,
    refresh_token,
    expires_in: pair.ttlSec,
    token_type: "Bearer"
  });
});

// POST /orders (protected)
appB.post("/orders", authMiddlewareB, (req, res) => {
  const { userId, amount, currency } = req.body || {};

  if (!userId || userId <= 0) {
    return res.status(422).json({
      code: "INVALID_USER",
      message: "userId must be a positive number"
    });
  }
  if (amount == null || amount <= 0) {
    return res.status(422).json({
      code: "INVALID_AMOUNT",
      message: "amount must be positive"
    });
  }
  if (!currency) {
    return res.status(422).json({
      code: "INVALID_CURRENCY",
      message: "currency required"
    });
  }

  const id = orders.length + 1;
  const order = {
    id,
    userId,
    amount,
    currency,
    status: "created",
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  res.status(201).json(order);
});

const PORT_B = 3002;
appB.listen(PORT_B, () => {
  console.log(`Service B (Orders) running at http://localhost:${PORT_B}`);
});



//// Note Postman Setting
// svcA_baseUrl = http://localhost:3001
// svcB_baseUrl = http://localhost:3002
// svcA_client_id = demo-a
// svcA_client_secret = demo-secret-a
// svcB_client_id = demo-b
// svcB_client_secret = demo-secret-b