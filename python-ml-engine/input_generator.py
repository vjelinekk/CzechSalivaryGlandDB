#!/usr/bin/env python3
"""
Generate test input JSON files for ML engine testing
Creates realistic mock patient data for train/predict/info modes
"""

import json
from pathlib import Path


def generate_mock_patients(num_patients=60):
    """Generate mock patient data for testing"""
    mock_patients = []

    for i in range(num_patients):
        patient = {
            # Feature 1: Age at diagnosis (50-79 years)
            'age_at_diagnosis': 50 + (i % 30),

            # Feature 2 & 3: T-stage and overall stage (string codes)
            'pathological_t_code': ['T1', 'T2', 'T3', 'T4a', 'T4b'][i % 5],
            'clinical_t_code': ['T1', 'T2', 'T3'][i % 3],  # Fallback with less variation

            # Overall stage (stored as grade in staging table)
            'pathological_grade_code': ['Stage I', 'Stage II', 'Stage III', 'Stage IVA', 'Stage IVB'][i % 5],
            'clinical_grade_code': ['Stage I', 'Stage II', 'Stage III'][i % 3],  # Fallback

            # Feature 4-6: Binary histopathology features
            'lymphatic_invasion': ['yes', 'no'][i % 2],
            'perineural_invasion': ['yes', 'no'][(i + 1) % 2],
            'extranodal_extension': 'yes' if i % 4 == 0 else 'no',

            # Feature 7: Positive node count (0-10)
            'positive_node_count': i % 11,

            # Outcome variables
            'is_alive': i % 3 == 0,  # 1/3 alive, 2/3 dead
            'diagnosis_year': 2015 + (i % 8),
            'death_date': None if i % 3 == 0 else f"202{2 + (i % 3)}-06-15",
            'last_follow_up': '2024-01-01' if i % 3 == 0 else f"202{2 + (i % 3)}-06-15",
            'recidive': i % 2 == 0,  # 1/2 recurrence rate (50% → 30 events for 60 patients)
            'date_of_recidive': f"202{1 + (i % 3)}-03-10" if i % 2 == 0 else None,
            'date_of_first_post_treatment_follow_up': f"20{15 + (i % 8)}-06-01",
        }

        # For some patients, use clinical stage as primary (no pathological)
        if i % 15 == 0:
            patient['pathological_t_code'] = None
            patient['pathological_grade_code'] = None

        mock_patients.append(patient)

    return mock_patients


def generate_train_input(model_path="/tmp/test_model.joblib", model_type="recurrence", algorithm="rsf"):
    """Generate train mode input JSON"""
    return {
        "mode": "train",
        "model_type": model_type,
        "algorithm": algorithm,
        "model_path": model_path,
        "data": {
            "patients": generate_mock_patients(60)
        }
    }


def generate_predict_input(model_path="/tmp/test_model.joblib"):
    """Generate predict mode input JSON (single patient)"""
    patients = generate_mock_patients(1)
    return {
        "mode": "predict",
        "model_path": model_path,
        "data": {
            "patient": patients[0]
        }
    }


def generate_info_input(model_path="/tmp/test_model.joblib"):
    """Generate info mode input JSON"""
    return {
        "mode": "info",
        "model_path": model_path
    }


def main():
    """Generate test input files"""
    # Create test_inputs directory if it doesn't exist
    script_dir = Path(__file__).parent
    test_inputs_dir = script_dir / "test_inputs"
    test_inputs_dir.mkdir(exist_ok=True)

    # Generate different test input files
    files_to_generate = {
        "train_input.json": generate_train_input(
            model_path="/tmp/test_recurrence_model.joblib",
            model_type="recurrence",
            algorithm="rsf"
        ),
        "train_survival_input.json": generate_train_input(
            model_path="/tmp/test_survival_model.joblib",
            model_type="overall_survival",
            algorithm="coxph"
        ),
        "predict_input.json": generate_predict_input("/tmp/test_recurrence_model.joblib"),
        "info_input.json": generate_info_input("/tmp/test_recurrence_model.joblib"),
        "simple_test_input.json": generate_train_input(
            model_path="/tmp/simple_test_model.joblib",
            model_type="recurrence",
            algorithm="rsf"
        ),
    }

    # Write all test input files
    for filename, data in files_to_generate.items():
        output_path = test_inputs_dir / filename
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"✓ Generated: {output_path}")

    print(f"\nGenerated {len(files_to_generate)} test input files in {test_inputs_dir}/")
    print("\nUsage examples:")
    print(f"  Train:   cat {test_inputs_dir}/train_input.json | python3 ml_engine.py")
    print(f"  Predict: cat {test_inputs_dir}/predict_input.json | python3 ml_engine.py")
    print(f"  Info:    cat {test_inputs_dir}/info_input.json | python3 ml_engine.py")


if __name__ == '__main__':
    main()
