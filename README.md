# Sifra AI – Intelligent Fitness Coach

Sifra AI is a full-stack AI-powered fitness platform that combines Computer Vision, Real-Time Pose Estimation, Voice Coaching, and Workout Analytics to create a personalized virtual fitness coach.

The platform analyzes body posture in real time using MediaPipe, counts repetitions automatically, provides live voice feedback, and stores workout history for every user.

---

# Features

## Authentication

- Secure JWT Authentication
- Login & Registration
- Protected Routes
- User-specific workout history

---

## Workout Planner

Users can create their own workout plans.

Features include:

- Add Exercises
- Update Exercises
- Delete Exercises
- Store workouts in PostgreSQL
- User-specific workout plans

Example:

```
Squats
4 Sets × 12 Reps

Pushups
3 Sets × 15 Reps

Shoulder Press
4 Sets × 10 Reps
```

---

## AI Pose Detection

Built using Google MediaPipe Tasks Vision.

Features:

- Live webcam feed
- 33 Body Landmark Detection
- Skeleton Visualization
- Real-time pose tracking

Detected landmarks include:

- Nose
- Eyes
- Shoulders
- Elbows
- Wrists
- Hips
- Knees
- Ankles

---

## Joint Angle Calculation

Sifra AI calculates joint angles from MediaPipe landmarks.

Example:

```
Hip
 ●

Knee
 ●

Ankle
 ●
```

The angle at the knee is calculated mathematically using landmark coordinates.

Angles monitored include:

- Knee Angle
- Hip Angle
- Shoulder Angle
- Elbow Angle
- Back Angle

These angles are used for exercise analysis.

---

## Automatic Rep Counter

The application automatically counts repetitions using pose transitions.

Supported exercises:

- Squats
- Push-ups
- Lunges
- Shoulder Press
- Deadlifts (Planned)

Example:

```
Rep 1

Rep 2

Rep 3
```

---

## AI Voice Coach

Provides live coaching while exercising.

Examples:

```
Go Lower.
```

```
Straighten your Back.
```

```
Excellent Form.
```

```
15 Reps Completed.
```

Voice feedback is generated intelligently using exercise state instead of repeating messages every frame.

---

## Workout Dashboard

Displays:

- Today's Workout
- Total Exercises
- Workout Progress
- Workout History

---

# System Architecture

```text
            React Frontend
                   │
                   ▼
         React Webcam Component
                   │
                   ▼
         MediaPipe Pose Detection
                   │
                   ▼
         33 Body Landmarks
                   │
                   ▼
        Joint Angle Calculator
                   │
                   ▼
         Exercise Logic Engine
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
   Rep Counter        Voice Feedback
         │                   │
         └─────────┬─────────┘
                   ▼
            Express Backend
                   │
                   ▼
             PostgreSQL DB
```

---

# Pose Detection Pipeline

```text
Camera
   │
   ▼
React Webcam
   │
   ▼
MediaPipe Pose
   │
   ▼
33 Landmarks
   │
   ▼
Angle Calculation
   │
   ▼
Exercise Detection
   │
   ▼
Rep Counter
   │
   ▼
Voice Feedback
```

---

# Angle Detection

MediaPipe returns body coordinates.

Example:

```text
Hip    (x1,y1)

Knee   (x2,y2)

Ankle  (x3,y3)
```

The application calculates:

- Knee Angle
- Hip Angle
- Elbow Angle
- Shoulder Angle

These angles determine:

- Exercise Stage
- Rep Count
- Form Accuracy
- Voice Feedback

---

# Exercise Analysis

Current implementation follows a rule-based AI engine.

Example:

```text
If Knee Angle < 90°

↓

User reached squat depth
```

```text
If Knee Angle > 165°

↓

Rep Completed
```

Future versions will integrate Machine Learning models for exercise classification and intelligent posture evaluation.

---

# Tech Stack

## Frontend

- React.js
- Tailwind CSS
- React Router
- Axios
- React Webcam

## Backend

- Node.js
- Express.js
- JWT Authentication

## Database

- PostgreSQL
- Prisma ORM

## AI & Computer Vision

- Google MediaPipe Tasks Vision
- JavaScript
- Angle Calculation Engine

## Voice AI

- Web Speech API
- ElevenLabs (Planned)

---

# Project Structure

```text
sifra-ai/

├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── mediapipe/
│   │   ├── services/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── Backend/
│   ├── src/
│   │   ├── Controllers/
│   │   ├── Routes/
│   │   ├── Middlewares/
│   │   ├── prisma/
│   │   └── data/
│   │
│   └── package.json
│
└── README.md
```

---

# Future Enhancements

- Machine Learning-based Exercise Classification
- AI-generated Workout Plans
- Personalized Nutrition Recommendations
- Exercise Accuracy Score
- Workout Performance Analytics
- Wearable Device Integration
- Mobile Application
- Community Challenges
- Cloud Deployment

---

# Why Sifra AI?

Most fitness applications only record workouts.

Sifra AI actively observes, analyzes, corrects, and guides users through their workouts using Computer Vision, Pose Estimation, Voice Coaching, and Real-Time Exercise Analysis.

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
