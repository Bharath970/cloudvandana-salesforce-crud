# Salesforce Object Manager

A web app for CRUD (Create, Read, Update, Delete) on Salesforce standard
objects — Account, Contact, Lead, Opportunity, Case — through a custom UI,
authenticated via Salesforce OAuth 2.0. Built for the CloudVandana Associate
Software Engineer assignment.

- **Backend**: Node.js + Express, uses `jsforce` to handle the OAuth 2.0
  Authorization Code flow and proxy CRUD calls to Salesforce's REST API.
  The Salesforce client secret and tokens live only on the server, in an
  HTTP-only session cookie — never in frontend JS.
- **Frontend**: React (Vite). Login button, object dropdown, a data table
  with infinite-scroll pagination (20 records per page), and a create/edit
  modal generated from field metadata.

## 1. Create a Salesforce Dev Org

1. Sign up at [developer.salesforce.com/signup](https://developer.salesforce.com/signup)
   (free).
2. Log in to the org once to confirm it's active.

## 2. Create an External Client App

1. In your Dev Org: **Setup → App Manager → New External Client App**.
2. Fill in a name and contact email.
3. Enable **OAuth Settings**:
   - Callback URL: `http://localhost:5000/auth/callback` for local dev
     (use your deployed backend's `/auth/callback` URL in production).
   - Selected OAuth Scopes: **Manage user data via APIs (api)** and
     **Perform requests at any time (refresh_token, offline_access)**.
   - Require Secret for Web Server Flow: enabled.
4. Save, then open the app to copy the **Consumer Key** and **Consumer
   Secret** — you'll need these for the backend `.env`.
5. It can take a few minutes for the app to become active.

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# fill in SF_CLIENT_ID, SF_CLIENT_SECRET, SESSION_SECRET, etc.
npm run dev
```

Runs on `http://localhost:5000` by default.

## 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# point VITE_API_BASE_URL at your backend if not localhost:5000
npm run dev
```

Runs on `http://localhost:5173` by default. Open it, click **Log in with
Salesforce**, authorize the app, and you'll land back in the object manager.

## How it maps to the assignment requirements

| Requirement | Where it's implemented |
|---|---|
| Login button → OAuth 2.0 via External Client App | `Login.jsx` → `GET /auth/login` → `routes/auth.js` (Authorization Code flow via `jsforce.OAuth2`) |
| Dropdown of 5 standard objects | `ObjectSelector.jsx`, object list from `GET /api/objects` |
| Dynamic fields (5–10 per object) | `backend/objectConfig.js`, served via `GET /api/objects/:name/fields`, consumed by `RecordTable.jsx` and `RecordFormModal.jsx` |
| View/create/edit/delete records | `RecordTable.jsx` (view + row actions) and `RecordFormModal.jsx` (create/edit), backed by `routes/records.js` |
| Pagination — 20 at a time, load more on scroll | `RecordTable.jsx` uses an `IntersectionObserver` sentinel row; backend paginates with SOQL `LIMIT`/`OFFSET` |
| Deploy on a free host | See below |

## 5. Deploying

**Backend** (Render, Railway, Fly.io, etc. — anything with a free Node tier):
- Set the same environment variables from `backend/.env.example`.
- Update `SF_CALLBACK_URL` to the deployed backend's `/auth/callback` and
  add that exact URL to the External Client App's OAuth settings.
- Update `FRONTEND_URL` to the deployed frontend's URL.

**Frontend** (Vercel, Netlify, etc.):
- Set `VITE_API_BASE_URL` to the deployed backend's URL.
- `npm run build` produces a static `dist/` folder to deploy.

After both are live, do one full login → CRUD → logout pass against the
deployed URLs before submitting, since cookie/CORS settings (`sameSite`,
`secure`) are the most common thing that breaks between localhost and a
real HTTPS deployment.

## Notes / design choices

- Tokens are kept server-side in an HTTP-only session cookie rather than
  sent to the frontend, since the OAuth Authorization Code flow requires
  the Consumer Secret and that must never reach the browser.
- Field lists per object are centrally defined in `objectConfig.js` (5–10
  fields each) rather than fetched live from the Salesforce `describe` API,
  to keep the UI predictable and avoid dumping 40+ raw fields on the user —
  swap in a live `describe` call there if you'd rather have it fully dynamic.
- Pagination uses SOQL `OFFSET`, which is simple and fine at this scale;
  for very large orgs you'd switch to keyset pagination or Salesforce's
  `nextRecordsUrl`.
