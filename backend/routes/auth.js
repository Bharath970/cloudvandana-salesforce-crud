const express = require("express");
const jsforce = require("jsforce");
const crypto = require("crypto");

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

// Step 1: Start Salesforce OAuth Authorization Code + PKCE flow.
router.get("/login", (req, res) => {
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);

  // Keep the verifier server-side. It must never be exposed to the browser.
  req.session.pkceVerifier = codeVerifier;

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

// Step 2: Salesforce redirects back with the authorization code.
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  const codeVerifier = req.session.pkceVerifier;

  if (!code) {
    return res.status(400).send("Missing authorization code from Salesforce.");
  }

  if (!codeVerifier) {
    return res.status(400).send("Missing PKCE verifier from session.");
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

    req.session.sf = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      instanceUrl: tokenData.instance_url,
      userId: userInfo.user_id,
      organizationId: userInfo.organization_id,
    };

    // PKCE verifier is no longer needed.
    delete req.session.pkceVerifier;

    res.redirect(`${process.env.FRONTEND_URL}?login=success`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.FRONTEND_URL}?login=error`);
  }
});

// Lets the frontend check whether the user is logged in.
router.get("/me", (req, res) => {
  if (req.session.sf) {
    return res.json({
      loggedIn: true,
      instanceUrl: req.session.sf.instanceUrl,
    });
  }

  res.json({ loggedIn: false });
});

// Logout.
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ loggedOut: true });
  });
});

module.exports = router;
