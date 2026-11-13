
# SIFRA AI

AI-powered fitness coaching platform with real-time pose analysis, form classification, and voice coaching.

## Project Overview

SIFRA AI is a full-stack fitness coaching application that analyzes exercise form in real time using computer vision. It combines MediaPipe pose landmark detection, geometric feature extraction, a trained RandomForest classifier, and rule-based movement assessment to provide form feedback and repetition counting for squats, push-ups, and planks.

The application includes user authentication with OTP email verification, JWT session management, workout tracking, timezone-aware streak calculation, dashboard analytics, profile image uploads, and AI voice coaching through an ElevenLabs backend proxy.

Three services are deployed independently: a React/Vite frontend, a Node.js/Express backend, and a Python/FastAPI ML inference service.

## Problem Statement

Most fitness applications either rely on pre-recorded video playback with no live feedback, or claim "AI" while using only hardcoded video metrics with no actual backend intelligence. Users have no way to verify whether their exercise form is correct in real time, and workout progress is not persisted with meaningful form-accuracy statistics.

## Solution

SIFRA AI provides:

- **Live pose detection** via MediaPipe Pose Landmarker running in the browser
- **Geometric feature extraction** (joint angles, symmetry, landmark visibility)
- **ML form classification** via a trained RandomForest model served by a Python FastAPI service
- **Support-envelope gating** — predictions are only trusted when they fall inside the training-data distribution
- **Rule-based movement assessment** that judges completed repetitions, not individual frames
- **Rep counting** via multi-frame state machines with EMA smoothing and depth-hold validation
- **Voice coaching** through a secure backend proxy to ElevenLabs (API key never reaches the frontend)
- **Full authentication** with OTP email verification, JWT httpOnly cookies, and token-version session revocation
- **Workout persistence** with timezone-aware streak tracking and server-side form-accuracy aggregation

## Key Features

| Feature | Description |
|---------|-------------|
| Real-time pose detection | MediaPipe tracks 33 body landmarks from webcam input in the browser |
| Exercise form classification | RandomForest model classifies squat, push-up, and plank form |
| Repetition counting | Multi-phase state machines count only valid, completed repetitions |
| Movement-aware form assessment | Judges completed reps using depth, symmetry, and torso alignment |
| Support-envelope gating | ML predictions are distrusted outside the training-data distribution |
| Voice coaching | Backend proxy to ElevenLabs TTS with response caching |
| Authentication | OTP email verification, JWT httpOnly cookies, 7-day expiry |
| Session revocation | JWT token versioning invalidates sessions on password reset |
| Workout tracking | Create, complete, update, and delete workouts with ownership checks |
| Streak calculation | Timezone-aware calendar-day streak tracking |
| Dashboard analytics | Server-side accuracy aggregation from persisted form scores |
| Profile management | Profile image upload via ImageKit |
| Rate limiting | Per-endpoint limits on auth, OTP, voice, ML prediction, and workout mutations |
| Security headers | Helmet CSP, HSTS, frameguard, referrer policy, `x-powered-by` disabled |

## AI/ML Pipeline Explanation

### MediaPipe Pose Landmarker

The frontend loads MediaPipe Pose Landmarker from Google's CDN. It processes each webcam frame and returns 33 3D pose landmarks with visibility scores. Landmark extraction happens entirely in the browser; no video or image data is sent to any server.

### Landmark Extraction

From the 33 landmarks, the frontend calculates:
- Joint angles: knee (hip-knee-ankle), elbow (shoulder-elbow-wrist), hip (shoulder-hip-knee), body (shoulder-hip-ankle)
- Symmetry score: left/right joint comparison
- Landmark visibility: confidence that key joints are visible

### Feature Engineering

Six numerical features are extracted per frame:
1. `knee_angle` — degrees
2. `elbow_angle` — degrees
3. `hip_angle` — degrees
4. `body_angle` — degrees
5. `symmetry_score` — 0.0 to 1.0
6. `landmark_visibility` — 0.0 to 1.0

Plus the exercise category string: `squat`, `pushup`, or `plank`.

### Model Input Features

Features are one-hot encoded by exercise category and reindexed to match the exact column order used during training:
`knee_angle, elbow_angle, hip_angle, body_angle, symmetry_score, landmark_visibility, exercise_plank, exercise_pushup, exercise_squat`

### Model Architecture and Algorithm

The model is a scikit-learn `RandomForestClassifier` (200+ estimators) exported via `joblib`. It is a classical ensemble of decision trees, not a neural network. It performs multi-class classification of exercise form labels.

### Training Process

The model was trained on a dataset of labeled exercise forms. The processed training dataset is stored at `ml-model/data/processed/sifra_ai_final_cleaned.csv`. Training notebooks are in `ml-model/notebooks/`. No retraining is performed as part of deployment.

### Dataset Source

The training data comes from the project's own collected exercise-form dataset. No public benchmark dataset is used. No accuracy metrics, dataset sizes, or benchmark results are claimed in this documentation.

### Label Encoding

Labels are encoded via scikit-learn `LabelEncoder`. The mapping between numeric classes and string labels is stored in `ml-model/models/label_encoder.pkl`.

### Prediction Process

1. Frontend sends feature vector to backend `/api/workout/predict`
2. Backend forwards to ML service `/predict` with `X-ML-Service-Secret`
3. ML service validates input via Pydantic, runs `model.predict()`, returns the form label
4. Optionally returns `predict_proba()` confidence as diagnostic only
5. Backend validates response structure and returns to frontend
6. Frontend checks support envelope before trusting the label

### Supported Exercise Categories

- `squat` — labels: `correct`, `shallow`, `forward_lean`, `knees_caving`
- `pushup` — labels: `pushup_correct`, `pushup_elbow_flare`, `pushup_body_sag`, `pushup_hips_high`
- `plank` — labels: `plank_correct`, `plank_hips_high`, `plank_hips_low`

### Prediction Limitations

- The model has **no standing pose** in its training data for squats (knee_angle max 138.28°). A standing squat pose is outside the support envelope and will produce a fabricated "shallow" prediction with high confidence.
- `elbow_angle` has zero variance in squat training data (always 90.2°); `knee_angle` and `elbow_angle` have zero variance in plank/pushup training data respectively. These features are excluded from support checks.
- Model confidence (`predict_proba`) is **not** a trust signal. The model reports high confidence even for out-of-distribution poses.
- Predictions are treated as **diagnostics only**. The authoritative form assessment comes from rule-based movement analysis of completed repetitions.

## Mathematical Feature Extraction

### Joint Angle Calculations

Angles are computed from 2D landmark coordinates using vector geometry:

```
angle = arccos( (a·b) / (|a| × |b|) )
```

Where `a` and `b` are vectors formed from three landmarks (e.g., hip-knee-ankle for knee angle).

### Symmetry Score

Compares left and right joint angles to quantify bilateral symmetry. Range: 0.0 (asymmetric) to 1.0 (symmetric).

### Landmark Visibility

MediaPipe provides a visibility score per landmark (0.0 to 1.0). The minimum visibility across key joints is used to determine whether a pose can be reliably measured.

## Machine Learning Model Explanation

### Algorithm

RandomForestClassifier — an ensemble of decision trees that votes on the predicted class. Each tree is trained on a bootstrap sample with random feature subsets.

### What the Model Does

Classifies exercise form into discrete labels (e.g., `correct`, `shallow`, `forward_lean`, `knees_caving` for squats).

### What the Model Does NOT Do

- Does not count repetitions
- Does not detect poses
- Does not measure joint angles
- Does not generate coaching text
- Does not assess movement quality over time

Rep counting, form assessment, and coaching are implemented as rule-based logic in the frontend and backend.

## Exercise Classification and Feedback Mapping

### Model Labels

Each exercise has a fixed set of form labels produced by the RandomForest model:

| Exercise | Labels |
|----------|--------|
| squat | correct, shallow, forward_lean, knees_caving |
| pushup | pushup_correct, pushup_elbow_flare, pushup_body_sag, pushup_hips_high |
| plank | plank_correct, plank_hips_high, plank_hips_low |

### Feedback Mapping

Model labels are mapped to human-readable coaching messages in `Backend/src/Services/coachingMessages.js`. Example:

- `shallow` → "Go a little deeper."
- `forward_lean` → "Keep your chest more upright."
- `knees_caving` → "Keep your knees aligned with your toes."

### Rule-Based Feedback (Authoritative)

The frontend's `formAssessment.js` overrides model output when:
- No descent was detected (standing pose → `null`)
- Depth stalled above comfortable threshold → `shallow`
- Knee asymmetry exceeds 15° with low symmetry → `knees_caving`
- Body angle below 145° → `forward_lean`
- Otherwise → `correct`

This is **not** machine learning. It is geometric threshold logic applied to completed repetitions.

## Voice Coaching Architecture

```
Frontend button press
    ↓
POST /api/voice/coaching (rate-limited: 20/min)
    ↓
Backend receives text cue
    ↓
Check in-memory speech cache (40 entries, LRU)
    ↓ Cache hit
Return cached audio
    ↓ Cache miss
Call ElevenLabs TTS API (server-side, API key hidden)
    ↓
Cache successful audio
    ↓
Return audio/mpeg to frontend
    ↓
Browser plays audio
```

- The ElevenLabs API key is **never** exposed to the frontend.
- Only successful syntheses are cached; transient failures are retried.
- Voice coaching is optional — if `ELEVENLABS_API_KEY` is not configured, the endpoint returns 500 gracefully.

## Backend and API Architecture

### Tech Stack

- Node.js + Express 5
- Prisma ORM with PostgreSQL
- JWT authentication (jsonwebtoken)
- bcrypt password hashing (cost 10)
- express-rate-limit for rate limiting
- helmet for security headers
- cors with credential support
- cookie-parser for httpOnly JWT cookies

### Middleware Stack

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `app.disable("x-powered-by")` | Hide Express fingerprint |
| 2 | `helmet` | CSP, HSTS, frameguard, referrer policy, content-type options |
| 3 | Structured request logging | JSON logs with `x-request-id`, method, path, status, duration, IP |
| 4 | `express.json()` + `cookie-parser` | Body parsing, cookie parsing |
| 5 | `cors` | Restricted origins, credentials enabled |
| 6 | `csrfProtection` | Origin/Referer validation on state-changing requests |
| 7 | Route-specific rate limiters | IP-based or user-based limits |
| 8 | Routes | Auth, workouts, profile, form prediction, voice |
| 9 | Centralized error handler | Consistent error shape, no stack traces in production |

### Route Reference

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| POST | `/api/auth/send-otp` | Send OTP email | No | 3/15min |
| POST | `/api/auth/verify-otp` | Verify OTP code | No | 5/15min |
| POST | `/api/auth/register` | Register user | No | 5/15min |
| POST | `/api/auth/login` | Login, set JWT cookie | No | 10/15min |
| POST | `/api/auth/logout` | Clear JWT cookie | No | None |
| GET | `/api/auth/me` | Get current user | Yes (JWT) | None |
| POST | `/api/auth/forgot-password` | Password reset request | No | 3/15min |
| POST | `/api/auth/reset-password` | Reset password with token | No | None |
| GET | `/api/workouts/stats` | Workout statistics | Yes | None |
| POST | `/api/workouts` | Create workout | Yes | 30/min/user |
| POST | `/api/workouts/complete` | Complete workout | Yes | 30/min/user |
| POST | `/api/workouts/:id/complete` | Complete specific workout | Yes | 30/min/user |
| GET | `/api/workouts` | List user workouts | Yes | None |
| PUT | `/api/workouts/:id` | Update workout | Yes | 30/min/user |
| DELETE | `/api/workouts/:id` | Delete workout (plan only) | Yes | 30/min/user |
| GET | `/api/profile` | Get profile | Yes | None |
| PUT | `/api/profile` | Update profile | Yes | None |
| POST | `/api/profile/image` | Upload profile image | Yes | None |
| POST | `/api/workout/predict` | ML form prediction | No | 30/min/IP |
| POST | `/api/voice/coaching` | Generate voice audio | No | 20/min |
| GET | `/api/health` | Health check | No | None |

### Authentication Details

- JWT signed with `JWT_SECRET`, expires in 7 days
- JWT payload includes `id`, `email`, and `tv` (token version)
- Stored in httpOnly, Secure, SameSite=None cookie
- `protectRoute` middleware verifies signature and checks `tokenVersion` against database
- Password reset increments `tokenVersion`, invalidating all existing sessions

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (sameorigin)
- `Strict-Transport-Security` with preload
- `Referrer-Policy: strict-origin-when-cross-origin`
- Content Security Policy restricting scripts, styles, fonts, images, and connections
- `x-powered-by` header removed

## Database Architecture

### Prisma Schema

Six models:
- **User** — id, fullName, email (unique), password, age, gender, weight, profileImage, tokenVersion, timestamps
- **PasswordResetToken** — id, userId, tokenHash, expiresAt, used, timestamps
- **OtpCode** — id, email, hashedOtp, expiresAt, lastSentAt, attempts, consumed, timestamps
- **Workout** — id, exercise, sets, reps, completed, accuracy, totalPredictions, correctPredictions, userId, completedAt, timestamps

### Relationships

- User has many Workouts (cascade delete)
- User has many PasswordResetTokens (cascade delete)
- Workout belongs to one User

### Indexes

- `User.email` (unique)
- `PasswordResetToken.userId`
- `PasswordResetToken.expiresAt`
- `OtpCode.email`
- `OtpCode.expiresAt`
- `Workout.userId, completed`

### Migrations

Six committed migrations in `Backend/prisma/migrations/`:
1. `20261006000000_add_completed_at_to_workout`
2. `20261014120000_add_prediction_counts_to_workout`
3. `20261021160000_reset_legacy_prediction_counters`
4. `20261031000000_add_otp_code`
5. `20261031010000_add_password_reset_token`
6. `20261031020000_add_token_version`

### Data Integrity

- Password reset tokens are single-use; all other tokens for a user are invalidated on reset
- OTP codes are single-use with cooldown and attempt limits
- Completed workouts cannot be deleted (protects streak and accuracy history)
- Workout ownership is verified on every mutation
- Accuracy is computed server-side from persisted prediction counters, not trusted from client

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, Vite | UI framework and build tool |
| Styling | Tailwind CSS | Utility-first CSS |
| Animations | GSAP | Scroll-triggered animations |
| 3D | Three.js | 3D product models on landing page |
| Pose Detection | MediaPipe Pose Landmarker | Browser-based pose estimation |
| Camera | react-webcam | Webcam access |
| Icons | lucide-react | Icon library |
| Backend | Node.js, Express 5 | API server |
| Database | PostgreSQL (Neon) | Production database |
| ORM | Prisma | Database access and migrations |
| Auth | JWT, bcrypt | Session management and password hashing |
| ML | Python, FastAPI, scikit-learn, joblib | Form classification service |
| Email | Brevo | Transactional email |
| Voice | ElevenLabs | Text-to-speech |
| Images | ImageKit | Profile image upload and delivery |
| Deployment | Render | Hosting for all three services |
| CI/CD | GitHub Actions | Automated testing and building |

## Repository Structure

```
SIFRA-AI/
├── Backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │       ├── 20261006000000_add_completed_at_to_workout/
│   │       ├── 20261014120000_add_prediction_counts_to_workout/
│   │       ├── 20261021160000_reset_legacy_prediction_counters/
│   │       ├── 20261031000000_add_otp_code/
│   │       ├── 20261031010000_add_password_reset_token/
│   │       └── 20261031020000_add_token_version/
│   ├── src/
│   │   ├── app.js
│   │   ├── Controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── formPrediction.controller.js
│   │   │   ├── profile.controller.js
│   │   │   └── workout.controller.js
│   │   ├── Middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── csrf.middleware.js
│   │   │   ├── rateLimiter.js
│   │   │   └── upload.middleware.js
│   │   ├── Routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── formPrediction.routes.js
│   │   │   ├── profile.routes.js
│   │   │   ├── voiceRoutes.js
│   │   │   └── workout.routes.js
│   │   ├── Services/
│   │   │   ├── coachingMessages.js
│   │   │   ├── elevenLabsService.js
│   │   │   ├── imagekit.service.js
│   │   │   ├── mail.service.js
│   │   │   ├── ml.service.js
│   │   │   └── otp.service.js
│   │   ├── Utils/
│   │   │   └── dayKey.js
│   │   └── data/
│   │       └── db.js
│   ├── server.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tests/
│       ├── accuracy.test.js
│       ├── csrf.test.js
│       ├── currentUser.test.js
│       ├── elevenLabs.cache.test.js
│       ├── forgotPassword.validation.test.js
│       ├── formPrediction.route.test.js
│       ├── ml.service.test.js
│       ├── sessionRevocation.test.js
│       ├── streak.test.js
│       ├── voiceRateLimit.test.js
│       └── workoutHistory.test.js
├── Frontend/
│   ├── src/
│   │   ├── api/axios.js
│   │   ├── components/
│   │   ├── Context/
│   │   ├── exercises/
│   │   ├── hooks/
│   │   ├── mathematics/
│   │   ├── mediapipe/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── voice/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tests/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
├── ml-model/
│   ├── api/main.py
│   ├── predict.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── .gitignore
│   ├── data/processed/sifra_ai_final_cleaned.csv
│   ├── data/raw/sifra_ai_phase6_raw_dataset.csv
│   ├── models/feature_columns.pkl
│   ├── models/label_encoder.pkl
│   ├── models/sifra_form_model.pkl
│   ├── notebooks/
│   └── tests/test_prediction.py
├── .github/workflows/ci.yml
├── .gitignore
├── package.json
├── package-lock.json
├── render.yaml
└── README.md
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL database (Neon or local)
- npm or yarn
- pip

## Local Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/prathameshcodes03/SIFRA-AI.git
cd SIFRA-AI
```

### 2. Backend Setup

```bash
cd Backend
cp .env.example .env
# Edit .env with your values (never commit .env)
npm ci
npx prisma generate
npx prisma migrate deploy
npm start
```

### 3. Frontend Setup

```bash
cd Frontend
cp .env.example .env
# Edit VITE_API_URL to http://localhost:3000 for local development
npm ci
npm run dev
```

### 4. ML Service Setup

```bash
cd ml-model
cp .env.example .env
# Edit ML_SERVICE_SECRET to match the backend
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Terminal-by-Terminal Development Setup

**Terminal 1 — Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd Frontend
npm run dev
```

**Terminal 3 — ML Service:**
```bash
cd ml-model
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## Environment Variables Reference

### Backend (`Backend/.env`)

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `DATABASE_URL` | Prisma pooled connection string | Yes | `postgresql://user:pass@host/db?sslmode=require` |
| `DIRECT_DATABASE_URL` | Direct connection for Prisma migrations | Yes | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | JWT signing secret | Yes | `openssl rand -base64 32` |
| `OTP_SECRET` | HMAC secret for OTP codes (defaults to JWT_SECRET) | No | `openssl rand -hex 32` |
| `PORT` | Server port | No | `3000` |
| `FRONTEND_URL` | Frontend URL for CORS and reset links | No | `https://sifra-ai-1.onrender.com` |
| `ML_SERVICE_URL` | ML service base URL | No | `https://sifra-ai-rtho.onrender.com` |
| `ML_SERVICE_SECRET` | Shared secret for ML service auth | Yes (production) | `openssl rand -hex 32` |
| `BREVO_API_KEY` | Brevo email API key | No (email features) | From Brevo dashboard |
| `EMAIL_SENDER` | Verified sender email | No (email features) | `sender@example.com` |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key | No (image upload) | From ImageKit dashboard |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | No (image upload) | From ImageKit dashboard |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint | No (image upload) | From ImageKit dashboard |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key | No (voice features) | From ElevenLabs dashboard |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID | No (voice features) | From ElevenLabs dashboard |
| `ELEVENLABS_MODEL_ID` | ElevenLabs model ID | No | `eleven_flash_v2_5` |

### ML Service (`ml-model/.env`)

| Variable | Purpose | Required |
|----------|---------|----------|
| `ML_SERVICE_SECRET` | Shared secret matching backend | Yes (production) |
| `PORT` | Server port | No |
| `ML_CORS_ORIGINS` | Comma-separated allowed browser origins | No (production) |

### Frontend (`Frontend/.env`)

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_URL` | Backend API URL | Yes (production) |

### Secret Matching Requirements

- `ML_SERVICE_SECRET` must be **identical** on both the Backend and ML service.
- `JWT_SECRET` is backend-only and never shared.
- `OTP_SECRET` defaults to `JWT_SECRET` if not set.

### Confidential vs Public

**Confidential (never in frontend, never in git):**
`DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`, `OTP_SECRET`, `ML_SERVICE_SECRET`, `BREVO_API_KEY`, `IMAGEKIT_PRIVATE_KEY`, `ELEVENLABS_API_KEY`

**Public configuration (safe in frontend build):**
`VITE_API_URL`, `FRONTEND_URL`, `ML_SERVICE_URL`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`, `EMAIL_SENDER`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`

## Testing Instructions

### Backend

```bash
cd Backend
npm test
```

Requires PostgreSQL for full suite. DB-independent tests: 76 tests pass.

### Frontend

```bash
cd Frontend
npm test
npm run lint
npm run build
```

348 tests pass, lint clean, production build succeeds.

### ML Service

```bash
cd ml-model
python -m pytest tests/ -q
python -m py_compile api/main.py predict.py
```

10 tests pass, syntax check passes.

### Total

434 tests pass locally across all three services. 5 backend test files require a PostgreSQL instance and are blocked locally.

## CI/CD Workflow

`.github/workflows/ci.yml` runs on push and pull requests to `main` with three jobs:

1. **Backend** — PostgreSQL service container, `npm ci`, `prisma generate`, `prisma migrate deploy`, `npm test`
2. **Frontend** — `npm ci`, `npm test`, `npm run lint`, `npm run build`
3. **ML Service** — Python 3.11, `pip install -r requirements.txt`, `py_compile`, `pytest`

CI does not require production secrets. Test values are used for `DATABASE_URL`, `JWT_SECRET`, and `BREVO_API_KEY`.

## Production Deployment on Render

### Services

Three services are defined in `render.yaml`:

1. **Frontend** (`sifra-ai-1`) — Static site, `rootDir: Frontend`
2. **ML Service** (`sifra-ai-rtho`) — Python, `rootDir: ml-model`
3. **Backend** (`sifra-ai`) — Node, `rootDir: Backend`

### Build Commands

- Frontend: `npm ci && npm run build`
- ML Service: `pip install -r requirements.txt`
- Backend: `npm ci && npx prisma generate && npx prisma migrate deploy`

### Start Commands

- Frontend: (static hosting, no start command)
- ML Service: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- Backend: `npm start`

### Environment Variables to Set in Render Dashboard

Variables marked `sync: false` in `render.yaml` must be set manually in the Render dashboard as **secret environment variables**:

**Backend service:**
- `DATABASE_URL` (secret)
- `DIRECT_DATABASE_URL` (secret)
- `JWT_SECRET` (secret)
- `ML_SERVICE_SECRET` (secret — must match ML service)
- `BREVO_API_KEY` (secret)
- `IMAGEKIT_PRIVATE_KEY` (secret)
- `ELEVENLABS_API_KEY` (secret)

**ML service:**
- `ML_SERVICE_SECRET` (secret — must match backend)

**Frontend service:**
- `VITE_API_URL` (public — set to `https://sifra-ai.onrender.com`)

### Deployment Steps

1. Connect GitHub repository to Render
2. Create the three services using `render.yaml` or the Render dashboard
3. Set all `sync: false` secrets in the Render dashboard
4. Ensure `ML_SERVICE_SECRET` is identical on both Backend and ML service
5. Trigger deployment
6. Monitor build logs for migration errors

### Health Checks

- Backend: `GET /api/health` — returns 200 when database is connected
- ML Service: `GET /health` — returns 200 when model is loaded

## Security Considerations

- No `.env` files are tracked by Git
- All secrets use placeholder values in `.env.example`
- JWT tokens are httpOnly, Secure, SameSite=None cookies
- JWT token versioning enables session revocation
- ML service authenticates backend requests via `X-ML-Service-Secret` with constant-time comparison
- Rate limiting on all sensitive endpoints
- CSRF Origin/Referer validation on state-changing requests
- CORS restricted to allowed origins
- Security headers via Helmet (CSP, HSTS, X-Frame-Options, etc.)
- Password reset tokens are single-use with 15-minute expiry
- OTP codes are single-use with cooldown and attempt limits
- Forgot-password returns generic response regardless of user existence (anti-enumeration)
- No hardcoded secrets in committed files (verified by scan)

## Current Limitations

- No live production verification performed (requires Render dashboard access)
- Database backups dependent on Neon plan configuration
- No external error monitoring (Sentry or similar) configured
- ML `/predict` endpoint has no request size limit
- `Landing_Page.jsx` is monolithic (1,974 lines)
- `lucide` unused dependency adds minor bundle weight
- CI workflow exists but has not been executed on GitHub Actions

## Future Scope

- TypeScript migration
- End-to-end tests (Playwright/Cypress)
- External monitoring and alerting
- Database backup verification
- ML request size limits
- Landing page code-splitting

## Contribution Guidelines

1. Fork the repository
2. Create a feature branch from `main`
3. Make changes without touching `.env` files
4. Run all tests locally before submitting
5. Ensure `git diff --check` is clean
6. Open a pull request targeting `main`

## Developer Information

- **Repository:** https://github.com/prathameshcodes03/SIFRA-AI
- **Branch:** `main`
- **License:** ISC (Backend), Private (Frontend)
- **Maintainer:** prathameshcodes03

---


## Data Flow

### Exercise Analysis

1. User grants camera access in the browser
2. MediaPipe Pose Landmarker detects 33 landmarks per frame
3. Frontend extracts joint angles, symmetry, and visibility
4. Rep detector state machine evaluates whether a valid repetition was completed
5. If inside the model support envelope, features are sent to the backend
6. Backend forwards to the ML service with `X-ML-Service-Secret`
7. ML service validates the secret, validates input, runs RandomForest prediction
8. Backend validates the response structure and returns to frontend
9. Frontend applies rule-based form assessment (authoritative) and maps to coaching messages
10. Workout session is persisted to the database on completion

### Authentication

1. User registers with email, password, and OTP verification
2. OTP is sent via Brevo email, verified server-side
3. On login, JWT is signed with `id`, `email`, and `tv` (token version)
4. JWT is stored in httpOnly Secure SameSite=None cookie
5. On each authenticated request, `protectRoute` verifies the JWT and checks `tokenVersion` against the database
6. Password reset increments `tokenVersion`, invalidating all existing sessions

## Service Boundaries

| Service | Responsibility | Technology |
|---------|---------------|------------|
| Frontend | UI, pose detection, feature extraction, rep counting, form assessment | React, MediaPipe, vanilla JS |
| Backend | API, auth, database, ML proxy, voice proxy, rate limiting | Node.js, Express, Prisma |
| ML Service | Form classification inference | Python, FastAPI, scikit-learn |

## Database Schema

Four tables managed by Prisma:

- `User` — authentication and profile data
- `Workout` — workout records with form accuracy counters
- `OtpCode` — email verification OTPs
- `PasswordResetToken` — password reset tokens

Referential integrity is enforced with cascade deletes on `userId` foreign keys.

## Security Boundaries

- ElevenLabs API key never leaves the backend
- JWT secret never leaves the backend
- ML service secret shared only between backend and ML service
- Frontend never receives raw API keys
- All secrets configured via environment variables only
```

---

## File: `docs/API.md`

```markdown
# API Reference

## Base URL

- Local development: `http://localhost:3000`
- Production: `https://sifra-ai.onrender.com`

All backend routes are prefixed with `/api`.

## Authentication

Endpoints requiring authentication expect a JWT in an httpOnly cookie named `token`. The `protectRoute` middleware verifies the signature and checks the token version against the database.

## Endpoints

### Authentication

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| POST | `/api/auth/send-otp` | Send OTP to email | No | 3 / 15 min |
| POST | `/api/auth/verify-otp` | Verify OTP code | No | 5 / 15 min |
| POST | `/api/auth/register` | Register new user | No | 5 / 15 min |
| POST | `/api/auth/login` | Login, set JWT cookie | No | 10 / 15 min |
| POST | `/api/auth/logout` | Clear JWT cookie | No | None |
| GET | `/api/auth/me` | Get current user | Yes | None |
| POST | `/api/auth/forgot-password` | Request password reset | No | 3 / 15 min |
| POST | `/api/auth/reset-password` | Reset password with token | No | None |

#### POST /api/auth/register

**Request Body:**
```json
{
  "fullName": "string",
  "email": "string",
  "password": "string (8-72 chars)",
  "age": "number (>0)",
  "gender": "MALE | FEMALE | OTHER",
  "weight": "number (>0)",
  "otp": "6-digit string"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User Registered Successfully",
  "user": {
    "id": "string",
    "fullName": "string",
    "email": "string",
    "age": "number",
    "gender": "string",
    "weight": "number"
  }
}
```

#### POST /api/auth/login

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):** Sets httpOnly `token` cookie.
```json
{
  "success": true,
  "message": "Login Successful",
  "user": { ... }
}
```

### Workouts

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| GET | `/api/workouts/stats` | Workout statistics | Yes | None |
| POST | `/api/workouts` | Create workout | Yes | 30 / min / user |
| POST | `/api/workouts/complete` | Complete workout | Yes | 30 / min / user |
| POST | `/api/workouts/:id/complete` | Complete specific workout | Yes | 30 / min / user |
| GET | `/api/workouts` | List user workouts | Yes | None |
| PUT | `/api/workouts/:id` | Update workout | Yes | 30 / min / user |
| DELETE | `/api/workouts/:id` | Delete workout (plan only) | Yes | 30 / min / user |

Completed workouts cannot be deleted (returns 409).

### Profile

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/profile` | Get profile | Yes |
| PUT | `/api/profile` | Update profile | Yes |
| POST | `/api/profile/image` | Upload profile image | Yes |

### ML Prediction

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| POST | `/api/workout/predict` | Form prediction | No | 30 / min / IP |

**Request Body:**
```json
{
  "exercise": "squat | pushup | plank",
  "knee_angle": "number (0-360)",
  "elbow_angle": "number (0-360)",
  "hip_angle": "number (0-360)",
  "body_angle": "number (0-360)",
  "symmetry_score": "number (0-1)",
  "landmark_visibility": "number (0-1)"
}
```

**Response (200):**
```json
{
  "success": true,
  "exercise": "squat",
  "prediction": "correct | shallow | forward_lean | knees_caving",
  "confidence": "number (optional, diagnostic only)",
  "probabilities": { "label": "number" } (optional)
}
```

### Voice Coaching

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| POST | `/api/voice/coaching` | Generate TTS audio | No | 20 / min |

**Request Body:**
```json
{
  "text": "string"
}
```

**Response (200):** `audio/mpeg` binary.

### Health

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/health` | Backend health | No |

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "ISO string"
}
```

### ML Service Endpoints

Hosted separately at `ML_SERVICE_URL`.

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/health` | ML service health | No |
| POST | `/predict` | Form classification | `X-ML-Service-Secret` header |

**POST /predict Request:**
```json
{
  "exercise": "string",
  "knee_angle": "number",
  "elbow_angle": "number",
  "hip_angle": "number",
  "body_angle": "number",
  "symmetry_score": "number",
  "landmark_visibility": "number"
}
```

**POST /predict Response:**
```json
{
  "exercise": "string",
  "prediction": "string",
  "confidence": "number (optional)",
  "probabilities": { "label": "number" } (optional)
}
```

## Error Responses

All errors follow this shape:
```json
{
  "success": false,
  "message": "string",
  "requestId": "string (optional)"
}
```

Status codes: 400 (validation), 401 (auth), 403 (CSRF/forbidden), 404 (not found), 409 (conflict), 422 (ML validation), 429 (rate limit), 500 (server error), 502/503/504 (ML service errors).

In production, stack traces are omitted from error responses.
```

---

## File: `docs/DEPLOYMENT.md`

```markdown
# Deployment

SIFRA AI deploys three independent services on Render:

1. Frontend — React/Vite static site
2. Backend — Node.js/Express web service
3. ML Service — Python/FastAPI web service

## Prerequisites

- Render account
- GitHub repository connected to Render
- Neon PostgreSQL database (or any PostgreSQL provider)
- Brevo account (for email)
- ImageKit account (for profile images)
- ElevenLabs account (for voice coaching)

## render.yaml

The repository includes `render.yaml` at the root. It defines all three services with build commands, start commands, routes, and environment variable placeholders.

## Service Configuration

### Frontend (`sifra-ai-1`)

| Setting | Value |
|---------|-------|
| Runtime | Static |
| Root Directory | `Frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Path | `dist` |
| Routes | `/*` → `/index.html` |

**Environment Variables:**
- `VITE_API_URL` — Set to `https://sifra-ai.onrender.com`

### ML Service (`sifra-ai-rtho`)

| Setting | Value |
|---------|-------|
| Runtime | Python |
| Root Directory | `ml-model` |
| Plan | Free |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |

**Environment Variables:**
- `ML_SERVICE_SECRET` — Secret, must match Backend

### Backend (`sifra-ai`)

| Setting | Value |
|---------|-------|
| Runtime | Node |
| Root Directory | `Backend` |
| Plan | Free |
| Build Command | `npm ci && npx prisma generate && npx prisma migrate deploy` |
| Start Command | `npm start` |

**Environment Variables:**
- `NODE_ENV` — `production`
- `PORT` — `3000`
- `DATABASE_URL` — Secret, Neon pooled connection string
- `DIRECT_DATABASE_URL` — Secret, Neon direct connection string
- `JWT_SECRET` — Secret
- `ML_SERVICE_URL` — `https://sifra-ai-rtho.onrender.com`
- `ML_SERVICE_SECRET` — Secret, must match ML service
- `FRONTEND_URL` — `https://sifra-ai-1.onrender.com`
- `BREVO_API_KEY` — Secret
- `EMAIL_SENDER` — Public
- `IMAGEKIT_PRIVATE_KEY` — Secret
- `IMAGEKIT_PUBLIC_KEY` — Public
- `IMAGEKIT_URL_ENDPOINT` — Public
- `ELEVENLABS_API_KEY` — Secret
- `ELEVENLABS_VOICE_ID` — Public

## Configuring `sync: false` Variables

Variables marked `sync: false` in `render.yaml` are placeholders. Their actual values must be entered manually in the Render dashboard:

1. Open the Render dashboard
2. Select the service
3. Go to **Environment** tab
4. Add each variable as a **Secret Environment Variable**
5. For `ML_SERVICE_SECRET`, enter the same value on both Backend and ML service
6. Save changes and trigger a redeploy

## Database Migrations

The backend build command includes `npx prisma migrate deploy`. This runs all pending Prisma migrations against the production database during deployment.

**Never** use `prisma db push` in production. `prisma migrate deploy` is the correct production strategy.

## Deployment Steps

1. Connect the GitHub repository to Render
2. Create the three services using `render.yaml`
3. Set all secret environment variables in the Render dashboard
4. Ensure `ML_SERVICE_SECRET` is identical on Backend and ML service
5. Trigger deployment
6. Monitor build logs for migration errors
7. Verify health endpoints:
   - `GET https://sifra-ai.onrender.com/api/health`
   - `GET https://sifra-ai-rtho.onrender.com/health`

## Rollback

Render supports rolling back to a previous deploy from the dashboard. Prisma migrations are forward-only; database rollbacks require manual SQL reversal.

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| Backend fails to start | Missing `DATABASE_URL` or `JWT_SECRET` | Set in Render dashboard |
| ML `/predict` returns 401 | `ML_SERVICE_SECRET` mismatch | Set identical value on both services |
| Migration fails | `DIRECT_DATABASE_URL` not set | Set direct connection string in Render |
| Frontend API calls fail | `VITE_API_URL` wrong | Set to production backend URL |
| Email not sent | `BREVO_API_KEY` missing | Set in Render dashboard |
```

---

```markdown
# Contributing to SIFRA AI

Thank you for considering a contribution to SIFRA AI.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/SIFRA-AI.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests and linting
6. Commit and push
7. Open a pull request targeting `main`

## Code Standards

- Do not commit `.env` files. They are gitignored.
- Use placeholder values only in `.env.example` files.
- Run `git diff --check` before committing to avoid whitespace errors.
- Backend tests: `cd Backend && npm test`
- Frontend tests: `cd Frontend && npm test`
- Frontend lint: `cd Frontend && npm run lint`
- Frontend build: `cd Frontend && npm run build`
- ML tests: `cd ml-model && python -m pytest tests/ -q`
- ML syntax: `cd ml-model && python -m py_compile api/main.py predict.py`

## What to Contribute

- Bug fixes
- Test coverage improvements
- Documentation improvements
- Security hardening

## What Not to Contribute

- Real credentials or secrets
- UI redesigns without discussion
- New product features without discussion
- TypeScript migration (not planned without concrete reason)

## Pull Request Process

1. Ensure all tests pass locally
2. Ensure the frontend build and lint are clean
3. Ensure `git diff --check` is clean
4. Describe your changes clearly in the PR
5. Reference any related issues

## Security

If you discover a security vulnerability, do not open a public issue. Contact the maintainer directly.

Never expose API keys, database URLs, or JWT secrets in pull requests or comments.
```
