const express = require("express");
const jsforce = require("jsforce");
const { OBJECT_CONFIG } = require("../objectConfig");

const router = express.Router();

// Every route below needs a logged-in Salesforce session.
function requireAuth(req, res, next) {
  if (!req.session.sf) {
    return res.status(401).json({ error: "Not authenticated. Please log in with Salesforce." });
  }
  next();
}

// Rebuild a jsforce connection from the tokens stored in the session.
function getConnection(req) {
  const { accessToken, refreshToken, instanceUrl } = req.session.sf;
  return new jsforce.Connection({
    accessToken,
    refreshToken,
    instanceUrl,
    oauth2: new jsforce.OAuth2({
      loginUrl: process.env.SF_LOGIN_URL,
      clientId: process.env.SF_CLIENT_ID,
      clientSecret: process.env.SF_CLIENT_SECRET,
      redirectUri: process.env.SF_CALLBACK_URL,
    }),
  });
}

function assertValidObject(objectName, res) {
  if (!OBJECT_CONFIG[objectName]) {
    res.status(400).json({ error: `Unsupported object: ${objectName}` });
    return false;
  }
  return true;
}

router.use(requireAuth);

// GET /api/objects
// List of the 5 supported objects for the dropdown.
router.get("/objects", (req, res) => {
  const objects = Object.keys(OBJECT_CONFIG).map((key) => ({
    apiName: key,
    label: OBJECT_CONFIG[key].label,
  }));
  res.json(objects);
});

// GET /api/objects/:objectName/fields
// Field metadata (name/label/type) the frontend uses to build the table
// columns and the create/edit form, without the frontend hardcoding it.
router.get("/objects/:objectName/fields", (req, res) => {
  const { objectName } = req.params;
  if (!assertValidObject(objectName, res)) return;
  res.json(OBJECT_CONFIG[objectName].fields);
});

// GET /api/records/:objectName?offset=0&limit=20
// Pagination is implemented with SOQL LIMIT/OFFSET so "load next 20 on
// scroll" is just bumping the offset by 20 each time.
router.get("/records/:objectName", async (req, res) => {
  const { objectName } = req.params;
  if (!assertValidObject(objectName, res)) return;

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const fieldNames = OBJECT_CONFIG[objectName].fields.map((f) => f.name);
  const soql = `SELECT Id, ${fieldNames.join(", ")} FROM ${objectName} ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;

  try {
    const conn = getConnection(req);
    const result = await conn.query(soql);
    res.json({
      records: result.records,
      totalSize: result.totalSize,
      hasMore: offset + result.records.length < result.totalSize,
    });
  } catch (err) {
    console.error(`Query error on ${objectName}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/records/:objectName
router.post("/records/:objectName", async (req, res) => {
  const { objectName } = req.params;
  if (!assertValidObject(objectName, res)) return;

  try {
    const conn = getConnection(req);
    const result = await conn.sobject(objectName).create(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Create failed", details: result.errors });
    }
    res.status(201).json(result);
  } catch (err) {
    console.error(`Create error on ${objectName}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// PATCH /api/records/:objectName/:id
router.patch("/records/:objectName/:id", async (req, res) => {
  const { objectName, id } = req.params;
  if (!assertValidObject(objectName, res)) return;

  try {
    const conn = getConnection(req);
    const result = await conn.sobject(objectName).update({ Id: id, ...req.body });
    if (!result.success) {
      return res.status(400).json({ error: "Update failed", details: result.errors });
    }
    res.json(result);
  } catch (err) {
    console.error(`Update error on ${objectName}/${id}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// DELETE /api/records/:objectName/:id
router.delete("/records/:objectName/:id", async (req, res) => {
  const { objectName, id } = req.params;
  if (!assertValidObject(objectName, res)) return;

  try {
    const conn = getConnection(req);
    const result = await conn.sobject(objectName).destroy(id);
    if (!result.success) {
      return res.status(400).json({ error: "Delete failed", details: result.errors });
    }
    res.json(result);
  } catch (err) {
    console.error(`Delete error on ${objectName}/${id}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
