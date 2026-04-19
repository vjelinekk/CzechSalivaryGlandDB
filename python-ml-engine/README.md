# Python ML Engine for CSGDB

Standalone Python module for survival analysis risk scoring using Random Survival Forest and Cox Proportional Hazards models.

## Files

- `ml_engine.py` - Main entry point (stdin/stdout interface)
- `feature_extractor.py` - Feature extraction and preprocessing
- `survival_model.py` - Model training and prediction
- `requirements.txt` - Python dependencies
- `build.sh` - Build standalone executable with PyInstaller
- `test_ml_engine.py` - Test suite with mock data

## Installation

```bash
cd python-ml-engine
pip3 install -r requirements.txt
```

## Usage

### 1. Train a Model

```bash
echo '{
  "mode": "train",
  "model_type": "overall_survival",
  "algorithm": "rsf",
  "model_path": "/tmp/model.joblib",
  "data": {
    "patients": [...]
  }
}' | python3 ml_engine.py
```

**Output:**
```json
{
  "success": true,
  "mode": "train",
  "result": {
    "c_index": 0.78,
    "n_samples": 234,
    "n_events": 89,
    "training_date": "2026-02-03T10:30:00",
    "algorithm": "rsf",
    "model_type": "overall_survival"
  }
}
```

### 2. Predict Risk Score

```bash
echo '{
  "mode": "predict",
  "model_path": "/tmp/model.joblib",
  "data": {
    "patient": {...}
  }
}' | python3 ml_engine.py
```

**Output:**
```json
{
  "success": true,
  "mode": "predict",
  "result": {
    "risk_score": 0.65,
    "survival_probability_1year": 0.85,
    "survival_probability_3year": 0.67,
    "survival_probability_5year": 0.52,
    "top_risk_factors": [
      {"feature": "lymphatic_invasion", "importance": 0.24},
      {"feature": "t_stage_3.0", "importance": 0.18}
    ]
  }
}
```

### 3. Get Model Info

```bash
echo '{
  "mode": "info",
  "model_path": "/tmp/model.joblib"
}' | python3 ml_engine.py
```

## Testing

The test suite is split into three levels, each with a distinct purpose.

### Running the tests

Install pytest if not already present:

```bash
pip3 install pytest
```

**Fast unit tests only** (~1 second):

```bash
.venv/bin/python -m pytest test_feature_extractor.py test_validators.py -v
```

**Full suite including integration and behavioural tests** (~minutes):

```bash
.venv/bin/python -m pytest -v
```

### Test files

#### `test_feature_extractor.py` — Unit tests

Tests the internal logic of `feature_extractor.py` in isolation, without training any model.
Each test focuses on a single function with clearly defined inputs and expected outputs.

- **`TestParseTStage`** — Verifies that T-stage string codes (`T1`–`T4`, `T4a`, `T4b`, `TX`) are converted to the correct ordinal value, and that invalid or missing codes return `NaN`.
- **`TestParseGrade`** — Verifies that overall stage codes (`Stage I`–`Stage IVC`) map correctly to ordinal values, including the edition 2 ambiguity where `Stage IV` (no suffix) maps to 4.
- **`TestApplyStageFallback`** — Verifies that pathological staging is preferred over clinical, and that the fallback to clinical staging works correctly when pathological data is missing or empty.
- **`TestCalculateSurvivalTime`** — Verifies that survival time (days from diagnosis to death or last follow-up) is calculated correctly: dead patients use death date, alive patients use last follow-up, and patients with unresolvable dates are excluded (returned as `NaN`). Also checks that durations are clamped to a minimum of 1 day.
- **`TestCalculateRecurrenceTime`** — Same coverage for recurrence time (days from first post-treatment follow-up to recurrence or last follow-up), including fallback to diagnosis date when treatment date is absent.
- **`TestExtractTargets`** — Verifies that the correct event indicator and time array are returned for both `overall_survival` and `recurrence` model types, and that an unknown model type raises a `ValueError`.

#### `test_validators.py` — Unit tests

Tests `validate_input()` in `validators.py` in isolation.

- Valid inputs for all three modes (`train`, `predict`, `info`) pass through unchanged.
- Missing required top-level fields raise a `ValueError` with a message naming the missing field.
- Missing nested fields (`data.patients`, `data.patient`) raise a `ValueError`.
- An unknown or missing `mode` raises a `ValueError`.

#### `test_ml_engine.py` — Integration tests

Spawns `ml_engine.py` as a subprocess — the same way the Electron host does — and asserts on the JSON response. A single model is trained once per test session (via a pytest module-scoped fixture) and reused across predict and info tests to avoid redundant training.

- Train mode returns a valid C-index, sample count, event count, and bootstrap C-index.
- Predict mode returns a risk score in `[0, 1]`, recurrence probabilities for 1, 3, and 5 years, and a list of top risk factors.
- Info mode returns model metadata with all expected keys.
- Error paths: too few training patients and a missing model file both produce a `success: false` JSON response with exit code 1.

#### `sanity_check.py` — Behavioural tests

Trains a model on 100 synthetic patients with clearly separated high-risk and low-risk profiles (e.g., age 85 vs. 35, M1 vs. M0, N3b vs. N0) and asserts that the model's output is clinically plausible.

- The high-risk patient receives a higher risk score than the low-risk patient.
- 5-year recurrence probability is greater than or equal to 1-year probability (monotonicity).
- All predicted probabilities are within `[0, 1]`.
- Recurrence and recurrence-free probabilities sum to 1.0 for each time point.

## Building Standalone Executable

To create a standalone binary for distribution:

```bash
chmod +x build.sh
./build.sh
```

The executable will be created in `dist/ml_engine`.

## Requirements

- **Minimum training data**: 50 patients with at least 30 events
- **Python**: 3.8+
- **Key dependencies**:
  - scikit-survival==0.22.2
  - scikit-learn==1.3.2
  - numpy==1.24.3
  - pandas==2.1.4

## Features Extracted

### Numeric Features (2)
- age_at_diagnosis
- positive_node_count

### Binary Features (3 - treated as numeric 0/1)
- lymphatic_invasion
- perineural_invasion
- extranodal_extension

### Categorical Features (2 - one-hot encoded)
- t_stage (pathological T-stage ID, falls back to clinical if missing)
- grade (pathological grade ID, falls back to clinical if missing)

## Risk Score Calculation

**Formula**: `Risk = 1.0 - SurvivalProbability(1825 days)`

The model:
1. Predicts survival function using `predict_survival_function(X)`
2. Evaluates probability at 1825 days (5 years)
3. Calculates risk as the complement: `1.0 - P(survival at 5 years)`

Both Random Survival Forest and Cox Proportional Hazards use the same calculation method.

## Error Handling

All errors are returned via stdout as JSON:

```json
{
  "success": false,
  "error": "Insufficient training data: 45 patients (need at least 50)"
}
```

Exit codes:
- `0` - Success
- `1` - Error (check stderr for details)
