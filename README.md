


##  Overview

**SIFRA AI** is an intelligent fitness coaching platform that uses computer vision, machine learning, and AI-powered voice feedback to help users improve their exercise form.

The system uses **MediaPipe Pose Landmarker** to detect body landmarks, mathematical geometry to calculate exercise-related features, and a machine learning model to classify exercise form.

When incorrect form is detected, SIFRA generates an appropriate coaching message. The message can then be converted into natural-sounding speech using the **ElevenLabs Text-to-Speech API**.

SIFRA is designed to provide accessible, interactive, and technology-driven fitness guidance without requiring continuous supervision from a personal trainer.

---

##  Key Features

###  AI-Powered Pose Detection

- Uses MediaPipe Pose Landmarker for body pose estimation.
- Detects human body landmarks from camera input.
- Uses body landmarks to calculate exercise-specific geometric features.
- Supports exercise form analysis.

###  Machine Learning Form Classification

- Uses calculated body features as ML model inputs.
- Classifies exercise form into different categories.
- Supports form analysis for:
  - Squats
  - Push-ups
  - Planks

### Mathematical Angle Calculation

- Calculates joint angles using landmark coordinates.
- Uses geometric relationships between body joints.
- Example: Knee angle calculation using the hip, knee, and ankle landmarks.
- Uses mathematical feature extraction before ML prediction.

###  AI Voice Coaching

- Converts form predictions into coaching messages.
- Uses a feedback-mapping system for exercise-specific corrections.
- Integrates with the ElevenLabs Text-to-Speech API.
- Converts feedback text into natural-sounding audio.
- Backend-based API integration keeps the ElevenLabs API key secure.

###  Workout Dashboard

- Displays workout-related user statistics.
- Includes accuracy and workout streak tracking.
- Uses stored workout data for user-specific statistics.
- Designed to update based on completed workout sessions.

###  Personalized Workout Plan

- Displays the user's workout plan.
- Supports selecting and starting workouts.
- Designed to connect workout planning with the exercise analysis workflow.

###  User Authentication

- User registration and login.
- Authenticated user-specific data.
- Protected backend operations.
- Profile and workout-related data management.

---

##  How SIFRA AI Works

```text
User Starts Workout
        │
        ▼
React Workout Interface
        │
        ▼
Camera Input
        │
        ▼
MediaPipe Pose Landmarker
        │
        ▼
33 Body Landmarks
        │
        ▼
Mathematical Feature Extraction
        │
        ▼
Angles, Distances and Other Features
        │
        ▼
Machine Learning Model
        │
        ▼
Exercise Form Prediction
        │
        ▼
Feedback Engine
        │
        ▼
Coaching Message
        │
        ▼
ElevenLabs Text-to-Speech API
        │
        ▼
Audio Feedback
        │
        ▼
User Improves Exercise Form
```

---

##  Technical Workflow

### 1. Pose Detection

MediaPipe Pose Landmarker detects human body landmarks from the camera feed.

The detected landmarks include body points such as:

- Shoulder
- Elbow
- Wrist
- Hip
- Knee
- Ankle

Each landmark contains positional information that can be used for further calculations.

---

### 2. Mathematical Feature Extraction

SIFRA calculates exercise-related features using the detected landmark coordinates.

For example, the knee angle during a squat is calculated using:

```text
Hip → Knee → Ankle
```

The knee is the vertex of the angle.

The angle between the two vectors is calculated using the dot-product formula:

θ = cos⁻¹((A · B) / (|A| × |B|))
```

The calculated features are then passed to the machine learning model.

**Important:** The mathematical calculations determine the angles. The ML model uses these calculated features to classify exercise form.

---

### 3. Machine Learning Prediction

The ML model receives extracted features such as:

- Knee angle
- Elbow angle
- Hip angle
- Body angle
- Symmetry score
- Landmark visibility

The model predicts a form category.

#### Example Form Labels

| Exercise | Prediction |
|---|---|
| Squat | `correct` |
| Squat | `shallow` |
| Squat | `forward_lean` |
| Squat | `knees_caving` |
| Push-up | `pushup_correct` |
| Push-up | `pushup_elbow_flare` |
| Push-up | `pushup_body_sag` |
| Push-up | `pushup_hips_high` |
| Plank | `plank_correct` |
| Plank | `plank_hips_high` |
| Plank | `plank_hips_low` |

---

### 4. Feedback Generation

The prediction is mapped to a predefined coaching message.

Example:

```text
Prediction:
knees_caving

Feedback:
Keep your knees aligned with your toes.
```

The feedback engine determines what the system should say. ElevenLabs is responsible for converting the generated text into speech.

---

### 5. Voice Coaching with ElevenLabs

SIFRA uses the ElevenLabs Text-to-Speech API to generate audio from coaching text.

```text
ML Prediction
      ↓
Feedback Message
      ↓
Express Backend
      ↓
ElevenLabs API
      ↓
Generated Audio
      ↓
Audio Playback
```

The ElevenLabs API key is stored on the backend and is not exposed to the React frontend.

For real-time usage, voice coaching should use persistence and cooldown logic so the same message is not generated repeatedly for every camera frame.

---

##  System Architecture

```text
                  ┌──────────────────────┐
                  │    React Frontend    │
                  │                      │
                  │ Auth / Dashboard     │
                  │ Workout Plan         │
                  │ Workout Camera       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Express Backend    │
                  │                      │
                  │ Auth APIs             │
                  │ Workout APIs          │
                  │ User APIs             │
                  │ Voice Coaching APIs   │
                  └───────┬───────┬──────┘
                          │       │
             ┌────────────┘       └────────────────┐
             ▼                                     ▼
  ┌──────────────────────┐              ┌──────────────────────┐
  │ Python ML Service    │              │ ElevenLabs API       │
  │                      │              │                      │
  │ FastAPI              │              │ Text-to-Speech       │
  │ Trained ML Model     │              │ Audio Generation     │
  └──────────────────────┘              └──────────────────────┘
             │
             ▼
  ┌──────────────────────┐
  │ Trained ML Model     │
  │ .pkl Files           │
  └──────────────────────┘

                  ┌──────────────────────┐
                  │ PostgreSQL Database  │
                  │                      │
                  │ Users                │
                  │ Workout Data         │
                  │ Workout Results      │
                  └──────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- JavaScript
- React Webcam
- MediaPipe
- GSAP (where applicable)

### Backend

- Node.js
- Express.js
- REST APIs
- Authentication middleware
- API integration with Python ML service
- ElevenLabs API integration

### Database

- PostgreSQL
- Prisma ORM

### Machine Learning and Computer Vision

- Python
- FastAPI
- MediaPipe Pose Landmarker
- NumPy
- Pandas
- Scikit-learn
- Pickle-based model export

### AI Voice

- ElevenLabs Text-to-Speech API

### Development and Deployment

- Git
- GitHub
- Postman
- Docker (planned/where applicable)
- AWS / Render deployment (planned or configured according to deployment setup)

---

##  Project Structure

The exact structure may vary depending on the current implementation.

```text
SIFRA-AI/
│
├── Backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   │   ├── elevenLabsService.js
│   │   └── coachingMessages.js
│   ├── middleware/
│   ├── prisma/
│   ├── server.js
│   └── .env
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── WorkoutPlan.jsx
│   │   │   └── Camerafeed.jsx
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── ml-model/
│   ├── data/
│   │   ├── raw/
│   │   └── processed/
│   ├── notebooks/
│   ├── models/
│   │   ├── sifra_form_model.pkl
│   │   ├── label_encoder.pkl
│   │   └── feature_columns.pkl
│   ├── predict.py
│   └── requirements.txt
│
└── README.md
```

---

##  Installation and Setup

### Prerequisites

Install the following tools:

- Node.js
- npm
- Python 3.x
- PostgreSQL
- Git

You will also need an ElevenLabs API key if voice generation is enabled.

---

### 1. Clone the Repository

```bash
git clone https://github.com/prathameshcodes03/SIFRA-AI.git
cd SIFRA-AI
```

---

### 2. Install Frontend Dependencies

```bash
cd Frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

---

### 3. Install Backend Dependencies

```bash
cd Backend
npm install
```

Create a `.env` file in the backend directory.

Example:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string

ML_SERVICE_URL=http://127.0.0.1:8000

ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
ELEVENLABS_MODEL_ID=your_elevenlabs_model_id
```

**Never commit your `.env` file or expose API keys in frontend code.**

Add the following to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
```

Start the backend:

```bash
npm run dev
```

Use the appropriate start command if the project uses a different script.

---

### 4. Start the Python ML Service

Navigate to the ML service directory:

```bash
cd ml-model
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI service using the project's configured command.

Example:

```bash
uvicorn main:app --reload --port 8000
```

The actual command may vary according to the Python service entry file.

---

## 🔌 API Architecture

The application uses Express as the main backend layer.

The ML service is accessed through the backend rather than exposing the model directly to the frontend.

```text
React
  ↓
Express API
  ↓
Python FastAPI ML Service
  ↓
Prediction
  ↓
Express Response
  ↓
React
```

Voice generation follows a separate backend-controlled flow:

```text
Express Backend
  ↓
ElevenLabs API
  ↓
Audio Response
```

### Example Voice Coaching Request

```http
POST /api/voice/coaching
Content-Type: application/json
```

Request body:

```json
{
  "prediction": "knees_caving"
}
```

The backend maps the prediction to an appropriate coaching message and requests speech generation.

> Check the current backend route configuration for the exact API base URL and endpoint.

---

## 🧪 Testing

Testing tools used or intended for the project:

- Postman for API testing
- Python model prediction tests
- FastAPI health checks
- Express-to-Python integration tests
- Frontend workout flow testing
- Database persistence testing

### ML Service Checks

The ML pipeline should verify:

- Model loading
- Label encoder loading
- Feature column compatibility
- Exercise prediction
- Input validation
- FastAPI health endpoint
- Express-to-Python communication

### Voice API Testing

Because ElevenLabs usage consumes credits:

- Use short test messages.
- Avoid repeated API requests.
- Do not call ElevenLabs for every camera frame.
- Test the API integration minimally.
- Use mocked responses for repeated development tests where possible.

---

##  Dashboard Statistics

SIFRA is designed to provide user-specific workout statistics such as:

### Accuracy

Accuracy can be calculated from valid exercise form predictions.

Example:

```text
Accuracy =
Correct Form Predictions / Total Valid Predictions × 100
```

The final calculation should use the application's stored workout and prediction data.

### Workout Streak

The streak represents consecutive days on which the user completes a workout.

Multiple workouts on the same day should not incorrectly count as multiple streak days.

Statistics should be associated with the authenticated user and persist through refreshes and future sessions.

---

##  Security Considerations

- Keep API keys on the backend.
- Never expose the ElevenLabs API key in React.
- Store sensitive values in environment variables.
- Validate API inputs.
- Protect user-specific workout data.
- Verify authenticated user ownership before accessing workout records.
- Avoid sending unnecessary requests to external APIs.
- Do not commit secrets to GitHub.

---

##  Development Roadmap

### Phase 1 — UI Foundation

- [x] Initial frontend structure
- [x] Landing page
- [x] Navigation and layout
- [x] Responsive design

### Phase 2 — Authentication

- [x] User authentication
- [x] Login and registration flow
- [x] Protected user functionality

### Phase 3 — Workout and Database

- [x] Workout-related CRUD functionality
- [x] Database integration
- [x] User workout data management

### Phase 4 — Profile and Dashboard

- [x] Profile integration
- [x] Dashboard structure
- [x] User statistics foundation

### Phase 5 — Pose Detection

- [x] MediaPipe integration
- [x] Landmark detection
- [x] Exercise-specific landmark identification
- [x] Mathematical feature extraction

### Phase 6 — Machine Learning

- [x] Dataset preparation
- [x] Data cleaning
- [x] Feature preparation
- [x] Model training
- [x] Model export
- [x] Prediction testing
- [x] FastAPI integration
- [x] Express-to-Python integration

### Phase 7 — AI Voice Coaching

- [x] Coaching message mapping
- [x] ElevenLabs backend integration
- [ ] Feedback persistence and cooldown
- [ ] Complete real-time audio playback
- [ ] End-to-end workout voice testing

### Phase 8 — Final Integration and Deployment

- [ ] Complete end-to-end workout flow
- [ ] Dashboard accuracy and streak verification
- [ ] Workout plan integration verification
- [ ] Performance optimization
- [ ] Security review
- [ ] Production deployment
- [ ] Final user testing

---

## 🎯 Future Scope

Potential future improvements include:

- Support for additional exercises.
- Personalized workout recommendations.
- More advanced exercise-specific form analysis.
- Improved feedback persistence and cooldown mechanisms.
- Workout progress visualization.
- Advanced user performance analytics.
- Mobile application support.
- Cloud deployment and scalable ML services.
- Multi-language voice coaching.
- Improved accessibility features.

---

##  Current Limitations

- Exercise support is initially limited to squats, push-ups, and planks.
- Pose detection accuracy can depend on camera quality, lighting, body visibility, and camera angle.
- ML predictions depend on the quality and coverage of training data.
- Voice generation through ElevenLabs uses API credits.
- Real-time voice coaching requires appropriate persistence and cooldown handling to avoid excessive API requests.
- The final production behavior depends on the currently integrated frontend, backend, and ML service versions.

---

##  Developer

**Prathamesh Palekar**

- GitHub: [@prathameshcodes03](https://github.com/prathameshcodes03)
- Project: [SIFRA AI](https://github.com/prathameshcodes03/SIFRA-AI)


