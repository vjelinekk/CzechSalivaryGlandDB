#!/usr/bin/env python3
"""
Behavioural / model plausibility test for the ML engine.

Trains a model on clearly separated high-risk and low-risk patients, then
asserts that the model ranks them correctly.  This test validates that the
full pipeline (feature extraction → model training → prediction) produces
clinically plausible output.

This is intentionally slow (trains a real RSF model).

Run with:
    pytest sanity_check.py -v
"""

import json
import os
import subprocess
import tempfile

import pytest


# ---------------------------------------------------------------------------
# Mock data — clearly separated high-risk vs low-risk
# ---------------------------------------------------------------------------

def _create_mock_data(n=100):
    patients = []
    for i in range(n):
        is_high_risk = i % 2 == 0
        patient = {
            "age_at_diagnosis": 75 if is_high_risk else 35,
            "therapy_type": "chemotherapy" if is_high_risk else "surgery",
            "id_histology_type": 1,
            "pathological_m_id": 15 if is_high_risk else 14,
            "clinical_m_id": 14,
            "pathological_n_id": 13 if is_high_risk else 7,
            "clinical_n_id": 7,
            "is_alive": not is_high_risk,
            "diagnosis_date": "2018-06-15",
            "death_date": "2020-01-01" if is_high_risk else None,
            "last_follow_up": "2020-01-01" if is_high_risk else "2024-01-01",
            "recidive": is_high_risk,
            "date_of_recidive": "2019-01-01" if is_high_risk else None,
            "date_of_first_post_treatment_follow_up": "2018-06-01",
        }
        patients.append(patient)
    return patients


def _run_engine(input_data: dict) -> dict:
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
        f"stderr: {result.stderr}"
    )
    return json.loads(result.stdout)


# ---------------------------------------------------------------------------
# Fixture — train once for all tests in this module
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def trained_model():
    patients = _create_mock_data()
    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
        path = f.name

    output = _run_engine({
        "mode": "train",
        "model_type": "recurrence",
        "algorithm": "rsf",
        "model_path": path,
        "data": {"patients": patients},
    })
    assert output["success"], f"Training failed: {output.get('error')}"

    yield path

    if os.path.exists(path):
        os.remove(path)


_low_risk_patient = {
    "age_at_diagnosis": 30,
    "therapy_type": "surgery",
    "id_histology_type": 1,
    "pathological_m_id": 14,
    "pathological_n_id": 7,
    "diagnosis_date": "2020-06-15",
}

_high_risk_patient = {
    "age_at_diagnosis": 85,
    "therapy_type": "chemotherapy",
    "id_histology_type": 1,
    "pathological_m_id": 15,
    "pathological_n_id": 13,
    "diagnosis_date": "2020-06-15",
}


# ---------------------------------------------------------------------------
# Plausibility assertions
# ---------------------------------------------------------------------------

class TestModelPlausibility:
    def test_high_risk_score_exceeds_low_risk_score(self, trained_model):
        low = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model,
            "data": {"patient": _low_risk_patient},
        })
        high = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model,
            "data": {"patient": _high_risk_patient},
        })
        assert low["success"] and high["success"]
        assert high["result"]["risk_score"] > low["result"]["risk_score"], (
            f"Expected high-risk score ({high['result']['risk_score']:.4f}) > "
            f"low-risk score ({low['result']['risk_score']:.4f})"
        )

    def test_5year_recurrence_exceeds_1year_for_high_risk(self, trained_model):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model,
            "data": {"patient": _high_risk_patient},
        })
        result = output["result"]
        assert result["recurrence_probability_5year"] >= result["recurrence_probability_1year"], (
            f"5-year probability ({result['recurrence_probability_5year']:.4f}) should be >= "
            f"1-year probability ({result['recurrence_probability_1year']:.4f})"
        )

    def test_all_probabilities_are_between_0_and_1(self, trained_model):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model,
            "data": {"patient": _high_risk_patient},
        })
        result = output["result"]
        for key in ("recurrence_probability_1year", "recurrence_probability_3year", "recurrence_probability_5year"):
            assert 0.0 <= result[key] <= 1.0, f"{key} = {result[key]} is out of [0, 1]"

    def test_recurrence_free_and_recurrence_sum_to_one(self, trained_model):
        output = _run_engine({
            "mode": "predict",
            "model_type": "recurrence",
            "model_path": trained_model,
            "data": {"patient": _high_risk_patient},
        })
        result = output["result"]
        for year in ("1year", "3year", "5year"):
            total = result[f"recurrence_probability_{year}"] + result[f"recurrence_free_probability_{year}"]
            assert abs(total - 1.0) < 1e-6, f"Probabilities for {year} do not sum to 1: {total}"
