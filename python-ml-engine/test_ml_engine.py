#!/usr/bin/env python3
"""
Integration tests for the ML engine (train / predict / info modes).

Spawns ml_engine.py as a subprocess — the same way the Electron host does —
and asserts on the JSON response.  These tests are slow (~minutes) because
they train a real Random Survival Forest model.

Run with:
    pytest test_ml_engine.py -v
"""

import json
import os
import subprocess
import tempfile

import pytest

# ---------------------------------------------------------------------------
# Shared mock patient data (60 patients, minimum 50 required to train)
# ---------------------------------------------------------------------------

_mock_patients = []
for _i in range(60):
    _patient = {
        "age_at_diagnosis": 50 + (_i % 30),
        "therapy_type": ["surgery", "radiotherapy", "chemoradiotherapy", "chemotherapy"][_i % 4],
        "id_histology_type": 1 + (_i % 24),
        "pathological_m_id": 14 if _i % 10 != 0 else 15,
        "clinical_m_id": 14,
        "pathological_n_id": 7 + (_i % 7),
        "clinical_n_id": 7 + (_i % 5),
        "is_alive": _i % 3 == 0,
        "diagnosis_date": f"20{15 + (_i % 8)}-06-15",
        "death_date": None if _i % 3 == 0 else f"202{2 + (_i % 3)}-06-15",
        "last_follow_up": "2024-01-01" if _i % 3 == 0 else f"202{2 + (_i % 3)}-06-15",
        "recidive": _i % 2 == 0,
        "date_of_recidive": f"202{1 + (_i % 3)}-03-10" if _i % 2 == 0 else None,
        "date_of_first_post_treatment_follow_up": f"20{15 + (_i % 8)}-06-01",
    }
    if _i % 15 == 0:
        _patient["pathological_m_id"] = None
        _patient["pathological_n_id"] = None
    _mock_patients.append(_patient)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _run_engine(input_data: dict) -> dict:
    """Invoke ml_engine.py as a subprocess and return parsed JSON output."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_engine_path = os.path.join(script_dir, "ml_engine.py")
    result = subprocess.run(
        ["python3", ml_engine_path],
        input=json.dumps(input_data),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"ml_engine.py exited with code {result.returncode}.\n"
        f"stdout: {result.stdout}\n"
        f"stderr: {result.stderr}"
    )
    return json.loads(result.stdout)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def trained_model_path():
    """Train a model once for the whole module and clean up afterwards."""
    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
        path = f.name

    input_data = {
        "mode": "train",
        "model_type": "recurrence",
        "algorithm": "rsf",
        "model_path": path,
        "data": {"patients": _mock_patients},
    }
    output = _run_engine(input_data)
    assert output["success"], f"Training failed: {output.get('error')}"

    yield path

    if os.path.exists(path):
        os.remove(path)


# ---------------------------------------------------------------------------
# Train mode
# ---------------------------------------------------------------------------

class TestTrainMode:
    def test_success_flag_is_true(self, trained_model_path):
        # Training is done by the fixture; re-run a quick check via info
        assert os.path.exists(trained_model_path)

    def test_train_returns_c_index(self):
        with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
            path = f.name
        try:
            output = _run_engine({
                "mode": "train",
                "model_type": "overall_survival",
                "algorithm": "rsf",
                "model_path": path,
                "data": {"patients": _mock_patients},
            })
            assert output["success"]
            assert "c_index" in output["result"]
            assert 0.0 <= output["result"]["c_index"] <= 1.0
        finally:
            if os.path.exists(path):
                os.remove(path)

    def test_train_returns_sample_and_event_counts(self, trained_model_path):
        output = _run_engine({
            "mode": "info",
            "model_path": trained_model_path,
        })
        meta = output["result"]["model_metadata"]
        assert meta["n_samples"] == 60
        assert meta["n_events"] >= 15

    def test_train_returns_bootstrap_c_index(self, trained_model_path):
        output = _run_engine({
            "mode": "info",
            "model_path": trained_model_path,
        })
        meta = output["result"]["model_metadata"]
        assert "bootstrap_c_index" in meta
        assert 0.0 <= meta["bootstrap_c_index"] <= 1.0

    def test_train_fails_with_too_few_patients(self):
        with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
            path = f.name
        try:
            result = subprocess.run(
                ["python3", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml_engine.py")],
                input=json.dumps({
                    "mode": "train",
                    "model_type": "recurrence",
                    "algorithm": "rsf",
                    "model_path": path,
                    "data": {"patients": _mock_patients[:10]},
                }),
                capture_output=True,
                text=True,
            )
            assert result.returncode == 1
            output = json.loads(result.stdout)
            assert not output["success"]
            assert "error" in output
        finally:
            if os.path.exists(path):
                os.remove(path)


# ---------------------------------------------------------------------------
# Predict mode
# ---------------------------------------------------------------------------

class TestPredictMode:
    def test_predict_returns_risk_score(self, trained_model_path):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model_path,
            "data": {"patient": _mock_patients[0]},
        })
        assert output["success"]
        assert "risk_score" in output["result"]
        assert 0.0 <= output["result"]["risk_score"] <= 1.0

    def test_predict_returns_recurrence_probabilities(self, trained_model_path):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model_path,
            "data": {"patient": _mock_patients[0]},
        })
        result = output["result"]
        assert "recurrence_probability_1year" in result
        assert "recurrence_probability_3year" in result
        assert "recurrence_probability_5year" in result

    def test_predict_probabilities_increase_over_time(self, trained_model_path):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model_path,
            "data": {"patient": _mock_patients[0]},
        })
        result = output["result"]
        assert result["recurrence_probability_5year"] >= result["recurrence_probability_1year"]

    def test_predict_returns_top_risk_factors(self, trained_model_path):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model_path,
            "data": {"patient": _mock_patients[0]},
        })
        factors = output["result"].get("top_risk_factors", [])
        assert isinstance(factors, list)

    def test_predict_fails_with_missing_model(self):
        result = subprocess.run(
            ["python3", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml_engine.py")],
            input=json.dumps({
                "mode": "predict",
                "model_type": "recurrence",
                "model_path": "/nonexistent/model.joblib",
                "data": {"patient": _mock_patients[0]},
            }),
            capture_output=True,
            text=True,
        )
        assert result.returncode == 1
        output = json.loads(result.stdout)
        assert not output["success"]


# ---------------------------------------------------------------------------
# Info mode
# ---------------------------------------------------------------------------

class TestInfoMode:
    def test_info_returns_metadata(self, trained_model_path):
        output = _run_engine({
            "mode": "info",
            "model_path": trained_model_path,
        })
        assert output["success"]
        assert "model_metadata" in output["result"]

    def test_info_metadata_has_expected_keys(self, trained_model_path):
        output = _run_engine({
            "mode": "info",
            "model_path": trained_model_path,
        })
        meta = output["result"]["model_metadata"]
        for key in ("algorithm", "model_type", "training_date", "c_index", "n_samples", "n_events"):
            assert key in meta, f"Missing key: {key}"

    def test_info_fails_with_missing_model(self):
        result = subprocess.run(
            ["python3", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml_engine.py")],
            input=json.dumps({
                "mode": "info",
                "model_path": "/nonexistent/model.joblib",
            }),
            capture_output=True,
            text=True,
        )
        assert result.returncode == 1
        output = json.loads(result.stdout)
        assert not output["success"]
