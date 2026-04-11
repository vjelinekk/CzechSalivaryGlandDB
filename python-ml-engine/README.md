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

Run the test suite with mock data:

```bash
python3 test_ml_engine.py
```

This will:
1. Train a model with 60 mock patients
2. Predict risk score for a single patient
3. Retrieve model metadata

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
