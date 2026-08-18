const express = require("express");
const jsforce = require("jsforce");

const router = express.Router();

function getOAuth2() {
  return new jsforce.OAuth2({
    loginUrl: process.env.SF_LOGIN_URL,
    clientId: process.env.SF_CLIENT_ID,
    clientSecret: process.env.SF_CLIENT_SECRET,
    redirectUri: process.env.SF_CALLBACK_URL,
  });
}

// Step 1: kick off the OAuth 2.0 Authorization Code flow.
// The frontend's "Login with Salesforce" button just navigates the browser here.
router.get("/login", (req, res) => {
  const oauth2 = getOAuth2();
  const authUrl = oauth2.getAuthorizationUrl({ scope: "api refresh_token" });
  res.redirect(authUrl);
});

// Step 2: Salesforce redirects back here with a ?code=...
// Exchange the code for an access token + refresh token, store the
// resulting connection info in the server-side session, then bounce the
// user back to the React app.
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing authorization code from Salesforce.");
  }

  try {
    const conn = new jsforce.Connection({ oauth2: getOAuth2() });
    const userInfo = await conn.authorize(code);

    // Persist only what we need to rebuild a connection on later requests.
    req.session.sf = {
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken,
      instanceUrl: conn.instanceUrl,
      userId: userInfo.id,
      organizationId: userInfo.organizationId,
    };

    res.redirect(`${process.env.FRONTEND_URL}?login=success`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.FRONTEND_URL}?login=error`);
  }
});

// Lets the frontend check "am I logged in?" on page load.
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
  req.session.destroy(() => {
    res.json({ loggedOut: true });
  });
});

module.exports = router;
