from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd


MODEL_DIRECTORY = Path(__file__).resolve().parent / "models"


class FormPredictor:
    """Loads SIFRA's exported artifacts and predicts one form label."""

    def __init__(self, model, label_encoder, feature_columns):
        self.model = model
        self.label_encoder = label_encoder
        self.feature_columns = list(feature_columns)

    @classmethod
    def load(cls):
        """Load the existing trained artifacts once for reuse by callers."""
        model = joblib.load(MODEL_DIRECTORY / "sifra_form_model.pkl")
        label_encoder = joblib.load(MODEL_DIRECTORY / "label_encoder.pkl")
        feature_columns = joblib.load(MODEL_DIRECTORY / "feature_columns.pkl")

        return cls(model, label_encoder, feature_columns)

    def prepare_features(
        self,
        exercise,
        knee_angle,
        elbow_angle,
        hip_angle,
        body_angle,
        symmetry_score,
        landmark_visibility,
    ):
        """Mirror the one-hot encoding and feature order used during training."""
        input_data = pd.DataFrame(
            [
                {
                    "knee_angle": knee_angle,
                    "elbow_angle": elbow_angle,
                    "hip_angle": hip_angle,
                    "body_angle": body_angle,
                    "symmetry_score": symmetry_score,
                    "landmark_visibility": landmark_visibility,
                    "exercise": exercise,
                }
            ]
        )

        encoded_input = pd.get_dummies(
            input_data,
            columns=["exercise"],
            dtype=int,
        )

        return encoded_input.reindex(
            columns=self.feature_columns,
            fill_value=0,
        )

    def predict_form(
        self,
        exercise,
        knee_angle,
        elbow_angle,
        hip_angle,
        body_angle,
        symmetry_score,
        landmark_visibility,
    ):
        input_data = self.prepare_features(
            exercise=exercise,
            knee_angle=knee_angle,
            elbow_angle=elbow_angle,
            hip_angle=hip_angle,
            body_angle=body_angle,
            symmetry_score=symmetry_score,
            landmark_visibility=landmark_visibility,
        )

        encoded_prediction = self.model.predict(input_data)
        return self.label_encoder.inverse_transform(encoded_prediction)[0]


@lru_cache(maxsize=1)
def get_predictor():
    """Return one cached predictor for standalone Python callers."""
    return FormPredictor.load()


def predict_form(
    exercise,
    knee_angle,
    elbow_angle,
    hip_angle,
    body_angle,
    symmetry_score,
    landmark_visibility,
):
    """Standalone-compatible prediction helper for manual feature testing."""
    predictor = get_predictor()
    return predictor.predict_form(
        exercise=exercise,
        knee_angle=knee_angle,
        elbow_angle=elbow_angle,
        hip_angle=hip_angle,
        body_angle=body_angle,
        symmetry_score=symmetry_score,
        landmark_visibility=landmark_visibility,
    )


if __name__ == "__main__":
    result = predict_form(
        exercise="squat",
        knee_angle=90,
        elbow_angle=0,
        hip_angle=100,
        body_angle=165,
        symmetry_score=0.95,
        landmark_visibility=0.98,
    )

    print("Predicted Form:", result)
