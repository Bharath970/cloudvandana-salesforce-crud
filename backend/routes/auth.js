const express = require("express");
const jsforce = require("jsforce");
const crypto = require("crypto");

const {
  setAuthCookie,
  clearAuthCookie,
} = require("../authCookie");

const router = express.Router();

function getLoginUrl() {
  return process.env.SF_LOGIN_URL || "https://login.salesforce.com";
}

function createCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function createCodeChallenge(verifier) {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return match
    ? decodeURIComponent(match.substring(name.length + 1))
    : null;
}

function setPkceCookie(res, verifier) {
  res.setHeader(
    "Set-Cookie",
    `pkce_verifier=${encodeURIComponent(verifier)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
}

function clearPkceCookie(res) {
  const cookie =
    "pkce_verifier=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

  const existing = res.getHeader("Set-Cookie");

  if (existing) {
    res.setHeader("Set-Cookie", [
      ...(Array.isArray(existing) ? existing : [existing]),
      cookie,
    ]);
  } else {
    res.setHeader("Set-Cookie", cookie);
  }
}

// Start Salesforce OAuth Authorization Code + PKCE flow.
router.get("/login", (req, res) => {
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);

  setPkceCookie(res, codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SF_CLIENT_ID,
    redirect_uri: process.env.SF_CALLBACK_URL,
    scope: "api refresh_token",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl =
    `${getLoginUrl()}/services/oauth2/authorize?${params.toString()}`;

  res.redirect(authUrl);
});

// Salesforce OAuth callback.
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  const codeVerifier = getCookie(req, "pkce_verifier");

  if (!code) {
    return res.status(400).send("Missing authorization code from Salesforce.");
  }

  if (!codeVerifier) {
    return res.status(400).send("Missing PKCE verifier cookie.");
  }

  try {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.SF_CLIENT_ID,
      client_secret: process.env.SF_CLIENT_SECRET,
      redirect_uri: process.env.SF_CALLBACK_URL,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(
      `${getLoginUrl()}/services/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams.toString(),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Salesforce token error:", tokenData);
      return res.status(500).send("Salesforce OAuth token exchange failed.");
    }

    const conn = new jsforce.Connection({
      instanceUrl: tokenData.instance_url,
      accessToken: tokenData.access_token,
    });

    const userInfo = await conn.identity();

    const authData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      instanceUrl: tokenData.instance_url,
      userId: userInfo.user_id,
      organizationId: userInfo.organization_id,
    };

    // Keep the existing session for compatibility.
    req.session.sf = authData;

    // Persist authentication across Vercel serverless instances.
    setAuthCookie(res, authData);

    // PKCE verifier is no longer needed.
    clearPkceCookie(res);

    res.redirect(`${process.env.FRONTEND_URL}?login=success`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    clearPkceCookie(res);
    res.redirect(`${process.env.FRONTEND_URL}?login=error`);
  }
});

router.get("/me", (req, res) => {
  if (req.session.sf) {
    return res.json({
      loggedIn: true,
      instanceUrl: req.session.sf.instanceUrl,
    });
  }

  res.json({ loggedIn: false });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  clearPkceCookie(res);

  req.session.destroy(() => {
    res.json({ loggedOut: true });
  });
});

module.exports = router;
