import sys
import os

import joblib
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from predict import FormPredictor


MODEL_DIRECTORY = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

predictor = FormPredictor.load()


class TestPrediction:
    def test_valid_squat_prediction(self):
        result = predictor.predict_form(
            exercise="squat",
            knee_angle=90,
            elbow_angle=20,
            hip_angle=100,
            body_angle=165,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        assert result in ["correct", "shallow", "forward_lean", "knees_caving"]

    def test_valid_pushup_prediction(self):
        result = predictor.predict_form(
            exercise="pushup",
            knee_angle=92,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        assert result in [
            "pushup_correct",
            "pushup_elbow_flare",
            "pushup_body_sag",
            "pushup_hips_high",
        ]

    def test_valid_plank_prediction(self):
        result = predictor.predict_form(
            exercise="plank",
            knee_angle=92,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        assert result in ["plank_correct", "plank_hips_high", "plank_hips_low"]

    def test_unsupported_exercise_returns_prediction(self):
        # The model still returns a prediction even for unsupported exercise
        # (validation happens at the API layer, not in predict.py)
        result = predictor.predict_form(
            exercise="burpee",
            knee_angle=90,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        assert isinstance(result, str)

    def test_out_of_range_angle_returns_prediction(self):
        # The model still returns a prediction even for out-of-range angles
        # (validation happens at the API layer, not in predict.py)
        result = predictor.predict_form(
            exercise="squat",
            knee_angle=400,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        assert isinstance(result, str)

    def test_out_of_range_score_returns_prediction(self):
        # The model still returns a prediction even for out-of-range scores
        result = predictor.predict_form(
            exercise="squat",
            knee_angle=90,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=1.5,
            landmark_visibility=0.98,
        )
        assert isinstance(result, str)

    def test_class_probabilities_sum_to_one(self):
        probabilities = predictor.class_probabilities(
            exercise="squat",
            knee_angle=90,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        assert abs(sum(probabilities.values()) - 1.0) < 1e-6

    def test_feature_order_matches_training(self):
        input_data = predictor.prepare_features(
            exercise="squat",
            knee_angle=90,
            elbow_angle=90,
            hip_angle=170,
            body_angle=170,
            symmetry_score=0.95,
            landmark_visibility=0.98,
        )
        expected_columns = [
            "knee_angle",
            "elbow_angle",
            "hip_angle",
            "body_angle",
            "symmetry_score",
            "landmark_visibility",
            "exercise_plank",
            "exercise_pushup",
            "exercise_squat",
        ]
        assert list(input_data.columns) == expected_columns

    def test_model_has_predict_proba(self):
        assert hasattr(predictor.model, "predict_proba")

    def test_model_has_multiple_estimators(self):
        assert predictor.model.n_estimators >= 100


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v"])
