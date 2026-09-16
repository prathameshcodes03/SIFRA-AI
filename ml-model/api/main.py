from contextlib import asynccontextmanager
from pathlib import Path
import math
import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator

ML_MODEL_DIRECTORY = Path(__file__).resolve().parents[1]
if str(ML_MODEL_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(ML_MODEL_DIRECTORY))

from predict import FormPredictor


SUPPORTED_EXERCISES = {"squat", "pushup", "plank"}
ANGLE_FIELDS = {"knee_angle", "elbow_angle", "hip_angle", "body_angle"}
SCORE_FIELDS = {"symmetry_score", "landmark_visibility"}


class PredictionRequest(BaseModel):
    exercise: str
    knee_angle: float
    elbow_angle: float
    hip_angle: float
    body_angle: float
    symmetry_score: float
    landmark_visibility: float

    @field_validator("exercise")
    @classmethod
    def validate_exercise(cls, value):
        normalized_exercise = value.strip().lower()
        if normalized_exercise not in SUPPORTED_EXERCISES:
            supported_values = ", ".join(sorted(SUPPORTED_EXERCISES))
            raise ValueError(f"Unsupported exercise. Use one of: {supported_values}.")
        return normalized_exercise

    @field_validator(*ANGLE_FIELDS)
    @classmethod
    def validate_angle(cls, value):
        if not math.isfinite(value) or not 0 <= value <= 360:
            raise ValueError("Angle values must be finite numbers between 0 and 360.")
        return value

    @field_validator(*SCORE_FIELDS)
    @classmethod
    def validate_score(cls, value):
        if not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError("Score values must be finite numbers between 0 and 1.")
        return value


@asynccontextmanager
async def model_lifespan(app):
    try:
        app.state.predictor = FormPredictor.load()
        app.state.model_load_error = None
        print("SIFRA ML model loaded successfully.")
    except Exception as error:
        app.state.predictor = None
        app.state.model_load_error = error
        print(f"SIFRA ML model failed to load: {error}")

    yield


app = FastAPI(
    title="SIFRA Form Prediction API",
    version="1.0.0",
    lifespan=model_lifespan,
)


@app.get("/health")
def health_check():
    if app.state.predictor is None:
        raise HTTPException(
            status_code=503,
            detail="Model is unavailable. Check the API service logs.",
        )

    return {"status": "ok"}


@app.post("/predict")
def predict_form(payload: PredictionRequest):
    predictor = app.state.predictor
    if predictor is None:
        raise HTTPException(
            status_code=503,
            detail="Model is unavailable. Check the API service logs.",
        )

    try:
        prediction = predictor.predict_form(**payload.model_dump())
    except Exception as error:
        print(f"PREDICTION ERROR: {error}")
        raise HTTPException(
            status_code=500,
            detail="The form model could not complete this prediction.",
        ) from error

    return {
        "exercise": payload.exercise,
        "prediction": str(prediction),
    }
