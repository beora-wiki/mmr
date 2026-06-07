# beora-web — Red Door Concierge

Mobile web app for Red Door rehab clients. Two tabs:

- **Chat** — Beora concierge agent (Claude Haiku) that knows the merged Red Door schedule
- **Schedule** — All four Red Door calendars merged into one view

Plus a staff `/admin` dashboard to gate access by name + email.

Hosted on **GCS** (frontend) + **Cloud Run** (API) in GCP project `beora-492609` (Beora Care, HIPAA BAA). Chat uses **Vertex AI / Gemini** — same BAA-covered path as `beora-agent`, not Anthropic.

---

## Architecture

```
GCS bucket (static SPA)              Cloud Run (Node.js API)
  /login   name+email gate    ◀───▶   /api/login        Firestore allowlist → JWT
  /app     2-tab client       ◀───▶   /api/chat         Claude + schedule context
  /admin   staff users        ◀───▶   /api/schedule     merge 4 ICS feeds
                              ◀───▶   /api/admin/users  CRUD (admin token)

                                    Firestore: beora_web_users/{email}
```

---

## Repo layout

```
beora-web/
├── frontend/          React + Vite SPA → GCS
└── backend/           Express API → Cloud Run
```

---

## Local development

### 1. Prereqs
- Node 20+
- `gcloud` CLI authenticated against project `beora-492609`
- `gcloud auth application-default login` so Firestore works locally

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in
npm run dev
```

The API listens on `http://localhost:8080`.

### 3. Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8080" > .env.local
npm run dev
```

Open http://localhost:5173.

---

## Environment variables

### Backend (Cloud Run)

| Var | Purpose |
|---|---|
| `VERTEX_AI_PROJECT` | GCP project for Vertex AI (defaults to `GOOGLE_CLOUD_PROJECT`) |
| `VERTEX_AI_LOCATION` | Vertex region (default `us-central1`) |
| `DEFAULT_MODEL` | Gemini model (default `gemini-2.5-flash`, same as beora-agent) |
| `JWT_SECRET` | Signs client session tokens |
| `ADMIN_TOKEN` | Staff `/admin` access gate |
| `GOOGLE_CLOUD_PROJECT` | Firestore project (defaults to `beora-492609`) |
| `GOOGLE_CALENDAR_ID` | Red Door house schedule calendar ID |
| `GOOGLE_MEALS_CALENDAR_ID` | Red Door meals calendar ID |
| `GOOGLE_HOUSEKEEPING_CALENDAR_ID` | Red Door housekeeping calendar ID |
| `GOOGLE_ACTIVITIES_CALENDAR_ID` | Red Door activities calendar ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Local-only path to service account JSON; Cloud Run uses ADC |
| `SCHEDULE_LABEL_1`..`4` | Optional human label per calendar |
| `SCHEDULE_TIMEZONE` | Default `America/Los_Angeles`; `FACILITY_TIMEZONE` is accepted locally too |
| `CORS_ORIGIN` | Frontend origin (or leave unset for `*`) |

### Frontend (Vite build-time)

| Var | Purpose |
|---|---|
| `VITE_API_URL` | Cloud Run service URL (e.g. `https://beora-web-api-xxx.run.app`) |

---

## Deploy

### Backend → Cloud Run

```bash
cd backend
gcloud run deploy beora-web-api \
  --source . \
  --project beora-492609 \
  --region us-central1 \
  --service-account beora-service-account@beora-492609.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=beora-492609,VERTEX_AI_PROJECT=beora-492609,VERTEX_AI_LOCATION=us-central1,DEFAULT_MODEL=gemini-2.5-flash,SCHEDULE_TIMEZONE=America/Los_Angeles,GOOGLE_CALENDAR_ID=c_7a1bb1fd7ed3e5fa3a8fe33ac14dfd4dffe07a21258adf99f39f7dfeebb53c3a@group.calendar.google.com,GOOGLE_MEALS_CALENDAR_ID=c_0230b54f5c6d32d775b6ae0eaf5372920b16d4841883aa1aa4dc67f0c87e46b2@group.calendar.google.com,GOOGLE_HOUSEKEEPING_CALENDAR_ID=c_7c3bb7482823dd6630d3fa11eec4241c6d7515d095b00e38d4b28fd2937fb559@group.calendar.google.com,GOOGLE_ACTIVITIES_CALENDAR_ID=c_dbba4e5b034a441c4b91f59949482b48255283193a25cb2b4bc05f5c397a727b@group.calendar.google.com" \
  --set-secrets "JWT_SECRET=beora-jwt-secret:latest,ADMIN_TOKEN=beora-admin-token:latest"
```

The Cloud Run service account (`beora-service-account@beora-492609.iam.gserviceaccount.com`) must be shared on all four Google Calendars. It also needs Firestore — grant `roles/datastore.user` if not already set. For local development, set `GOOGLE_SERVICE_ACCOUNT_JSON=/Users/matthewmeakin/.gcp/beora-service-account.json`.

### Frontend → Cloud Run

```bash
cd frontend
gcloud run deploy beora-web \
  --source . \
  --project beora-492609 \
  --region us-central1 \
  --allow-unauthenticated \
  --set-build-env-vars "VITE_API_URL=https://beora-web-api-72qxx4nvxa-uc.a.run.app"

gcloud beta run domain-mappings create \
  --project beora-492609 \
  --region us-central1 \
  --service beora-web \
  --domain rdl.beora.care
```

Cloud Run returns the DNS records that must be added under `beora.care`. Google provisions the managed certificate after DNS propagates.

### Frontend → GCS (alternate)

```bash
cd frontend
VITE_API_URL=https://beora-web-api-xxx.run.app npm run build

# One-time bucket setup
gsutil mb -p beora-492609 -l US gs://beora-web
gsutil web set -m index.html -e 404.html gs://beora-web
gsutil iam ch allUsers:objectViewer gs://beora-web

# Each deploy
gsutil -m rsync -r -d dist/ gs://beora-web/
gsutil -m setmeta -h "Cache-Control:public, max-age=300" \
  gs://beora-web/index.html gs://beora-web/404.html
```

For a real domain (e.g. `redoor.beora.care`) put a Cloud Load Balancer with a managed SSL cert in front of the bucket — GCS website hosting itself is HTTP-only.

---

## Superadmins

Three emails are hardcoded as superadmins in `backend/lib/superadmins.js`:

- `alexs@beora.ai`
- `mattm@beora.ai`
- `travisr@beora.ai`

On every backend boot, these are auto-seeded into Firestore as `{ active: true, superadmin: true }` — so they can sign in immediately at `/login` with their email, no admin action required.

When a superadmin signs in:
- The web app shows a small **Admin** button in the header (next to Sign Out).
- They can navigate directly to `/admin` and the dashboard skips the token gate entirely.
- Their JWT carries `superadmin: true`, which the backend accepts in place of `X-Admin-Token`.

The shared `ADMIN_TOKEN` env var still works as a fallback path for staff who don't have an account.

To add or remove superadmins, edit `backend/lib/superadmins.js` and redeploy. (Or set `SUPER_ADMINS=a@x.com,b@x.com` env var on Cloud Run for additions without a code change.)

Hardcoded superadmins are protected — they cannot be deactivated or removed via the admin API.

## First-run staff setup

1. Deploy the backend. Superadmins are auto-seeded on boot.
2. Set `ADMIN_TOKEN` to a strong random string (Secret Manager) for the legacy staff path.
3. A superadmin signs in at `/login`, then taps **Admin** to manage clients.
4. Add clients by name + email. They sign in at `/login` with that exact email.
