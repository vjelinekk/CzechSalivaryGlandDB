#!/usr/bin/env python3
"""
Test script for ML engine
Creates mock patient data and tests train/predict/info modes
"""

import json
import subprocess
import tempfile
import os

# Mock patient data (malignant patients only)
# SIMPLIFIED 5-FEATURE MODEL:
# 1. age_at_diagnosis (numeric)
# 2. therapy_type (categorical string)
# 3. id_histology_type (categorical, IDs 1-24)
# 4. pathological_m_id with fallback to clinical_m_id (IDs 14-15)
# 5. pathological_n_id with fallback to clinical_n_id (IDs 7-13)

mock_patients = []
for i in range(60):  # Create 60 patients (minimum 50 required)
    patient = {
        # Feature 1: Age at diagnosis (50-79 years)
        'age_at_diagnosis': 50 + (i % 30),

        # Feature 2: Therapy type (categorical string)
        'therapy_type': ['surgery', 'radiotherapy', 'chemoradiotherapy', 'chemotherapy'][i % 4],

        # Feature 3: Histology type (IDs 1-24)
        'id_histology_type': 1 + (i % 24),

        # Feature 4 & 5: TNM staging (IDs from tnm_value_definition)
        # M stage: 14=M0, 15=M1
        'pathological_m_id': 14 if i % 10 != 0 else 15,  # Most M0, some M1
        'clinical_m_id': 14,  # Fallback for cases without pathological

        # N stage: 7=N0, 8=N1, 9=N2a, 10=N2b, 11=N2c, 12=N3a, 13=N3b
        'pathological_n_id': 7 + (i % 7),
        'clinical_n_id': 7 + (i % 5),  # Fallback with less variation

        # Outcome variables
        'is_alive': i % 3 == 0,  # 1/3 alive, 2/3 dead
        'diagnosis_date': f"20{15 + (i % 8)}-06-15",
        'death_date': None if i % 3 == 0 else f"202{2 + (i % 3)}-06-15",
        'last_follow_up': '2024-01-01' if i % 3 == 0 else f"202{2 + (i % 3)}-06-15",
        'recidive': i % 2 == 0,  # 1/2 recurrence rate (50% → 30 events for 60 patients)
        'date_of_recidive': f"202{1 + (i % 3)}-03-10" if i % 2 == 0 else None,
        'date_of_first_post_treatment_follow_up': f"20{15 + (i % 8)}-06-01",
    }

    # For some patients, use clinical stage as primary (no pathological)
    if i % 15 == 0:
        patient['pathological_m_id'] = None
        patient['pathological_n_id'] = None

    mock_patients.append(patient)


def test_train_mode():
    """Test training a model"""
    print("=" * 60)
    print("TEST 1: TRAIN MODE")
    print("=" * 60)

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as f:
        model_path = f.name

    # Prepare input
    input_data = {
        'mode': 'train',
        'model_type': 'recurrence',  # Changed to recurrence to show recurrence probabilities
        'algorithm': 'rsf',
        'model_path': model_path,
        'data': {
            'patients': mock_patients
        }
    }

    # Run ml_engine.py (from same directory as this test script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_engine_path = os.path.join(script_dir, 'ml_engine.py')
    result = subprocess.run(
        ['python3', ml_engine_path],
        input=json.dumps(input_data),
        capture_output=True,
        text=True
    )

    print(f"Exit code: {result.returncode}")
    print(f"Stdout:\n{result.stdout}")
    if result.stderr:
        print(f"Stderr:\n{result.stderr}")

    if result.returncode == 0:
        output = json.loads(result.stdout)
        if output['success']:
            print(f"\n✓ Training succeeded!")
            print(f"  C-index: {output['result']['c_index']:.3f}")
            print(f"  Samples: {output['result']['n_samples']}")
            print(f"  Events: {output['result']['n_events']}")
            return model_path
        else:
            print(f"\n✗ Training failed: {output['error']}")
            return None
    else:
        print(f"\n✗ Process failed with exit code {result.returncode}")
        return None


def test_predict_mode(model_path):
    """Test predicting risk score"""
    print("\n" + "=" * 60)
    print("TEST 2: PREDICT MODE")
    print("=" * 60)

    if not model_path or not os.path.exists(model_path):
        print("✗ Skipping (no model available)")
        return

    # Prepare input with a single patient
    input_data = {
        'mode': 'predict',
        'model_type': 'recurrence',  # Match the training model type
        'model_path': model_path,
        'data': {
            'patient': mock_patients[0]
        }
    }

    # Run ml_engine.py (from same directory as this test script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_engine_path = os.path.join(script_dir, 'ml_engine.py')
    result = subprocess.run(
        ['python3', ml_engine_path],
        input=json.dumps(input_data),
        capture_output=True,
        text=True
    )

    print(f"Exit code: {result.returncode}")
    print(f"Stdout:\n{result.stdout}")
    if result.stderr:
        print(f"Stderr:\n{result.stderr}")

    if result.returncode == 0:
        output = json.loads(result.stdout)
        if output['success']:
            print(f"\n✓ Prediction succeeded!")
            result_data = output['result']
            print(f"  Risk Score: {result_data['risk_score']:.3f}")
            # Check which type of probabilities are returned
            if 'recurrence_probability_1year' in result_data:
                print(f"  1-year recurrence: {result_data['recurrence_probability_1year']:.3f}")
                print(f"  3-year recurrence: {result_data['recurrence_probability_3year']:.3f}")
                print(f"  5-year recurrence: {result_data['recurrence_probability_5year']:.3f}")
                print(f"  1-year recurrence-free: {result_data['recurrence_free_probability_1year']:.3f}")
                print(f"  3-year recurrence-free: {result_data['recurrence_free_probability_3year']:.3f}")
                print(f"  5-year recurrence-free: {result_data['recurrence_free_probability_5year']:.3f}")
            else:
                print(f"  1-year survival: {result_data['survival_probability_1year']:.3f}")
                print(f"  3-year survival: {result_data['survival_probability_3year']:.3f}")
                print(f"  5-year survival: {result_data['survival_probability_5year']:.3f}")
            print(f"  Top risk factors:")
            for factor in result_data.get('top_risk_factors', []):
                print(f"    - {factor['feature']}: {factor['importance']:.3f}")
        else:
            print(f"\n✗ Prediction failed: {output['error']}")
    else:
        print(f"\n✗ Process failed with exit code {result.returncode}")


def test_info_mode(model_path):
    """Test getting model info"""
    print("\n" + "=" * 60)
    print("TEST 3: INFO MODE")
    print("=" * 60)

    if not model_path or not os.path.exists(model_path):
        print("✗ Skipping (no model available)")
        return

    # Prepare input
    input_data = {
        'mode': 'info',
        'model_path': model_path
    }

    # Run ml_engine.py (from same directory as this test script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_engine_path = os.path.join(script_dir, 'ml_engine.py')
    result = subprocess.run(
        ['python3', ml_engine_path],
        input=json.dumps(input_data),
        capture_output=True,
        text=True
    )

    print(f"Exit code: {result.returncode}")
    print(f"Stdout:\n{result.stdout}")
    if result.stderr:
        print(f"Stderr:\n{result.stderr}")

    if result.returncode == 0:
        output = json.loads(result.stdout)
        if output['success']:
            print(f"\n✓ Info retrieval succeeded!")
            metadata = output['result']['model_metadata']
            print(f"  Algorithm: {metadata.get('algorithm')}")
            print(f"  Model type: {metadata.get('model_type')}")
            print(f"  Training date: {metadata.get('training_date')}")
            print(f"  C-index: {metadata.get('c_index', 0):.3f}")
        else:
            print(f"\n✗ Info retrieval failed: {output['error']}")
    else:
        print(f"\n✗ Process failed with exit code {result.returncode}")


if __name__ == '__main__':
    print("ML Engine Test Suite")
    print("=" * 60)
    print(f"Testing with {len(mock_patients)} mock patients")
    print()

    # Run tests
    model_path = test_train_mode()
    test_predict_mode(model_path)
    test_info_mode(model_path)

    # Cleanup
    if model_path and os.path.exists(model_path):
        os.remove(model_path)
        print(f"\n✓ Cleaned up temporary model file")

    print("\n" + "=" * 60)
    print("All tests complete!")
    print("=" * 60)
