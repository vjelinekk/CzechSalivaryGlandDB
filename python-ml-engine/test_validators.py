#!/usr/bin/env python3
"""
Unit tests for validate_input (validators.py)

Covers:
  - Valid inputs for all three modes pass through unchanged
  - Missing top-level fields raise ValueError with a descriptive message
  - Missing nested fields (data.patients, data.patient) raise ValueError
  - Invalid or missing mode raises ValueError
"""

import pytest

from validators import validate_input


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _train_input(**overrides):
    base = {
        "mode": "train",
        "algorithm": "rsf",
        "model_type": "overall_survival",
        "model_path": "/tmp/model.joblib",
        "data": {"patients": [{"age_at_diagnosis": 50}]},
    }
    base.update(overrides)
    return base


def _predict_input(**overrides):
    base = {
        "mode": "predict",
        "model_path": "/tmp/model.joblib",
        "data": {"patient": {"age_at_diagnosis": 50}},
    }
    base.update(overrides)
    return base


def _info_input(**overrides):
    base = {
        "mode": "info",
        "model_path": "/tmp/model.joblib",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Valid inputs
# ---------------------------------------------------------------------------

class TestValidInputs:
    def test_train_mode_returns_input(self):
        data = _train_input()
        result = validate_input(data)
        assert result is data

    def test_predict_mode_returns_input(self):
        data = _predict_input()
        result = validate_input(data)
        assert result is data

    def test_info_mode_returns_input(self):
        data = _info_input()
        result = validate_input(data)
        assert result is data


# ---------------------------------------------------------------------------
# Train mode — missing fields
# ---------------------------------------------------------------------------

class TestTrainModeMissingFields:
    def test_missing_algorithm_raises(self):
        data = _train_input()
        del data["algorithm"]
        with pytest.raises(ValueError, match="algorithm"):
            validate_input(data)

    def test_missing_model_type_raises(self):
        data = _train_input()
        del data["model_type"]
        with pytest.raises(ValueError, match="model_type"):
            validate_input(data)

    def test_missing_model_path_raises(self):
        data = _train_input()
        del data["model_path"]
        with pytest.raises(ValueError, match="model_path"):
            validate_input(data)

    def test_missing_data_raises(self):
        data = _train_input()
        del data["data"]
        with pytest.raises(ValueError):
            validate_input(data)

    def test_missing_data_patients_raises(self):
        data = _train_input()
        data["data"] = {}
        with pytest.raises(ValueError, match="patients"):
            validate_input(data)


# ---------------------------------------------------------------------------
# Predict mode — missing fields
# ---------------------------------------------------------------------------

class TestPredictModeMissingFields:
    def test_missing_model_path_raises(self):
        data = _predict_input()
        del data["model_path"]
        with pytest.raises(ValueError, match="model_path"):
            validate_input(data)

    def test_missing_data_raises(self):
        data = _predict_input()
        del data["data"]
        with pytest.raises(ValueError, match="data"):
            validate_input(data)

    def test_missing_data_patient_raises(self):
        data = _predict_input()
        data["data"] = {}
        with pytest.raises(ValueError, match="patient"):
            validate_input(data)


# ---------------------------------------------------------------------------
# Info mode — missing fields
# ---------------------------------------------------------------------------

class TestInfoModeMissingFields:
    def test_missing_model_path_raises(self):
        data = _info_input()
        del data["model_path"]
        with pytest.raises(ValueError, match="model_path"):
            validate_input(data)


# ---------------------------------------------------------------------------
# Invalid mode
# ---------------------------------------------------------------------------

class TestInvalidMode:
    def test_unknown_mode_raises(self):
        with pytest.raises(ValueError, match="invalid_mode"):
            validate_input({"mode": "invalid_mode"})

    def test_missing_mode_raises(self):
        with pytest.raises(ValueError):
            validate_input({})

    def test_none_mode_raises(self):
        with pytest.raises(ValueError):
            validate_input({"mode": None})
