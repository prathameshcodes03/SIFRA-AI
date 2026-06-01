#  Sifra AI – Intelligent Fitness & Nutrition Coach

Sifra AI is a full-stack AI-powered fitness platform that combines Computer Vision, Voice AI, and Nutrition Intelligence to create a personalized virtual fitness coach. The system analyzes exercise posture in real time, provides voice-based feedback, tracks workouts, estimates nutritional values from food images, and helps users achieve their fitness goals through data-driven insights.

---

##  Features

###  AI Pose Detection & Form Analysis
- Real-time body landmark detection using MediaPipe
- Exercise posture analysis
- Joint angle calculations
- Form correction suggestions
- Injury prevention alerts
- Workout accuracy scoring

###  Automatic Rep Counter
- Detects exercise movement cycles
- Counts repetitions automatically
- Supports:
  - Squats
  - Push-ups
  - Lunges
  - Deadlifts
  - Shoulder Press
- Stores workout history

###  AI Voice Trainer
Powered by ElevenLabs Voice AI.

Provides real-time coaching such as:

- "Go lower."
- "Keep your back straight."
- "Excellent form."
- "15 reps completed."

Creates an experience similar to a personal trainer.

###  AI Nutrition Analysis
- Upload food images
- Food recognition
- Calorie estimation
- Macronutrient analysis
- Daily nutrition tracking

###  Smart Fitness Dashboard
Track:

- Workout history
- Rep statistics
- Accuracy scores
- Daily calorie intake
- Protein consumption
- Weight progression
- BMI trends

###  AI Fitness Assistant
Ask questions like:

- How many calories should I eat?
- Create a muscle gain workout plan.
- Suggest a high-protein meal.
- How much protein do I need daily?

---

##  System Architecture

```text
Frontend (React)
        │
        ▼
Node.js Backend API
        │
        ▼
PostgreSQL Database
        │
        ▼
Python AI Service
        │
 ┌──────┴──────┐
 ▼             ▼
MediaPipe    OpenCV
        │
        ▼
Exercise Analysis
        │
        ▼
ElevenLabs Voice Feedback
```

---

##  How AI Pose Detection Works

Sifra AI uses MediaPipe Pose to detect 33 body landmarks in real time.

Examples:

- Nose
- Shoulders
- Elbows
- Wrists
- Hips
- Knees
- Ankles

### Detection Pipeline

```text
Webcam Feed
      ↓
OpenCV
      ↓
MediaPipe
      ↓
33 Body Landmarks
      ↓
Angle Calculation
      ↓
Form Analysis
      ↓
Voice Feedback
```

---

##  Joint Angle Mapping

MediaPipe returns coordinates for body joints.

Example:

```text
Hip = (x1, y1)
Knee = (x2, y2)
Ankle = (x3, y3)
```

For a squat:

```text
Hip
  \
   \
    Knee
      \
       \
      Ankle
```

The knee becomes the central point used for angle calculation.

### Squat Analysis

| Position | Knee Angle |
|----------|------------|
| Standing | ~180° |
| Half Squat | ~120° |
| Deep Squat | ~90° |

Sifra AI continuously evaluates:

- Knee Angle
- Hip Angle
- Back Angle
- Shoulder Angle
- Elbow Angle

to determine exercise quality.

---

##  Real-Time Coaching Example

### Workout Started

```text
Welcome back.
Today's workout consists of:

15 Squats
10 Push-ups
20 Lunges
```

### During Workout

```text
Go lower.
```

```text
Keep your back straight.
```

```text
Excellent form.
```

### Workout Complete

```text
Workout completed.

15 repetitions recorded.

Workout Accuracy: 89%
```

---

##  Tech Stack

### Frontend

- React.js
- Tailwind CSS
- Framer Motion
- React Router
- Axios

### Backend

- Node.js
- Express.js
- JWT Authentication

### Database

- PostgreSQL

### AI & Computer Vision

- Python
- OpenCV
- MediaPipe
- NumPy
- FastAPI

### Voice AI

- ElevenLabs API
- Web Speech API

### Storage

- Cloudinary

### Deployment

- Vercel
- Render / Railway
- PostgreSQL Cloud

---

##  Project Structure

```text
sifra-ai/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   └── package.json
│
├── ai-service/
│   ├── pose_detection/
│   ├── nutrition_analysis/
│   ├── angle_calculations/
│   ├── voice_assistant/
│   └── main.py
│
├── database/
│
├── docs/
│
└── README.md
```

---

##  Future Enhancements

- AI-generated workout plans
- Personalized meal recommendations
- Wearable device integration
- Live trainer mode
- Community challenges
- Fitness leaderboard
- Mobile application
- Exercise recognition using custom ML models

---

##  Why Sifra AI?

Most fitness applications only record workouts.

Sifra AI actively observes, analyzes, corrects, and guides users through their fitness journey using AI-powered posture analysis, nutrition intelligence, and voice coaching.

The project demonstrates expertise in:

- Full-Stack Development
- Computer Vision
- AI Integration
- REST APIs
- Authentication & Security
- Database Design
- Real-Time Systems
- Voice AI
- Cloud Deployment

