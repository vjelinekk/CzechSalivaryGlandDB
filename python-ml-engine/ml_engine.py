#!/usr/bin/env python3
"""
ML Engine for CSGDB - Survival Analysis Risk Scoring
Reads JSON from stdin, performs ML operations, writes JSON to stdout

Usage:
    echo '{"mode": "train", ...}' | python3 ml_engine.py
"""

from ml_types import (
    TrainInputData,
    PredictInputData,
    InfoInputData,
    InputData,
    ModelModeEnum,
)

import json
import sys
import traceback
import multiprocessing
from datetime import datetime
from feature_extractor import FeatureExtractor
from ml_types.output_types import SuccessOutputData, ErrorOutputData
from ml_types.model_types import (
    TrainResultMetadata,
    SurvivalPredictionResult,
    RecurrencePredictionResult, ModelInfoResult,
)
from survival_model import SurvivalModel
from validators import validate_input
from typing import Union


def main() -> None:
    """Main entry point - reads stdin, routes to appropriate handler"""
    multiprocessing.freeze_support()
    try:
        # 1. Read and validate JSON from stdin
        raw_data = json.load(sys.stdin)
        input_data: InputData = validate_input(raw_data)

        # 2. Route to appropriate handler (type-narrowed by mode)
        mode = input_data['mode']

        if mode == ModelModeEnum.TRAIN:
            result = handle_train(input_data)  # input_data is TrainInputData
        elif mode == ModelModeEnum.PREDICT:
            result = handle_predict(input_data)  # input_data is PredictInputData
        elif mode == ModelModeEnum.INFO:
            result = handle_info(input_data)  # input_data is InfoInputData
        else:
            options = ", ".join([f'"{m.value}"' for m in ModelModeEnum])
            raise ValueError(f"Invalid mode: {mode}. Must be one of {options}")

        # 4. Write success response to stdout
        output: SuccessOutputData = {
            "success": True,
            "mode": mode,
            "result": result,
        }
        json.dump(output, sys.stdout, indent=2)
        sys.exit(0)

    except Exception as e:
        # 5. Write error response to stdout
        error_msg = str(e) if str(e) else repr(e)
        output: ErrorOutputData = {
            "success": False,
            "error": error_msg
        }
        json.dump(output, sys.stdout, indent=2)
        sys.stderr.write(f"Error: {error_msg}\n")
        sys.stderr.write("Traceback:\n")
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

def handle_train(input_data: TrainInputData) -> TrainResultMetadata:
    """Train a survival model and save to disk"""
    # Extract required fields (already validated by validate_input)
    patients = input_data['data']['patients']
    algorithm = input_data['algorithm']
    model_type = input_data['model_type']
    model_path = input_data['model_path']

    # Validate minimum sample size
    if len(patients) < 50:
        raise ValueError(f"Insufficient training data: {len(patients)} patients (need at least 50)")

    # Extract features
    extractor = FeatureExtractor()
    X, y_event, y_time, feature_names = extractor.fit_transform(patients, model_type)

    # Validate events
    n_events = int(sum(y_event))
    if n_events < 15:
        raise ValueError(f"Insufficient events: {n_events} events (need at least 15)")

    # Train model
    model = SurvivalModel(algorithm=algorithm)
    model.fit(X, y_event, y_time)

    # Calculate feature importance (permutation for RSF, coefficients for CoxPH)
    model.calculate_feature_importance(X, y_event, y_time, n_repeats=10)

    # Get performance metrics
    c_index = model.get_c_index(X, y_event, y_time)

    # Save model with metadata
    metadata: TrainResultMetadata = {
        'c_index': c_index,
        'n_samples': len(patients),
        'n_events': n_events,
        'training_date': datetime.now().isoformat(),
        'algorithm': algorithm,
        'model_type': model_type,
        'feature_names': feature_names
    }
    model.save(model_path, metadata, extractor)

    return metadata


def handle_predict(input_data: PredictInputData) -> Union[SurvivalPredictionResult, RecurrencePredictionResult]:
    """Predict risk score for a single patient"""
    # Extract required fields (already validated by validate_input)
    patient = input_data['data']['patient']
    model_path = input_data['model_path']

    # Load model and extractor
    try:
        model, extractor, metadata = SurvivalModel.load(model_path)
    except FileNotFoundError:
        raise ValueError(f"Model file not found: {model_path}")
    except Exception as e:
        raise ValueError(f"Failed to load model: {e}")

    # Extract features for single patient
    X = extractor.transform([patient])

    # Get model type from metadata
    model_type = metadata['model_type']

    # Calculate risk score and probabilities (survival or recurrence based on model type)
    result = model.predict_risk(X, model_type=model_type)

    # Get top risk factors (local for CoxPH, global for RSF)
    importance = model.get_local_feature_importance(X)
    feature_names = metadata.get('feature_names', [])

    if len(importance) == len(feature_names):
        # Sort by absolute importance descending
        importance_pairs = [(feature_names[i], float(importance[i]))
                           for i in range(len(importance))]
        importance_pairs.sort(key=lambda x: abs(x[1]), reverse=True)

        # Top 3 risk factors
        top_factors = [
            {"feature": name, "importance": imp}
            for name, imp in importance_pairs[:3]
        ]
    else:
        top_factors = []

    result['top_risk_factors'] = top_factors
    return result


def handle_info(input_data: InfoInputData) -> ModelInfoResult:
    """Get model metadata without prediction"""
    # Extract required fields (already validated by validate_input)
    model_path = input_data['model_path']

    try:
        _, _, metadata = SurvivalModel.load(model_path)
    except FileNotFoundError:
        raise ValueError(f"Model file not found: {model_path}")
    except Exception as e:
        raise ValueError(f"Failed to load model: {e}")

    return {'model_metadata': metadata}


if __name__ == '__main__':
    main()
