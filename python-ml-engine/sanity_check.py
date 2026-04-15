#!/usr/bin/env python3
"""
Sanity check for ML engine predictions.
Trains a model and verifies that high-risk patients get higher scores than low-risk patients.
"""

import json
import subprocess
import os
import tempfile

def create_mock_data(n=100):
    patients = []
    for i in range(n):
        # Evenly distribute some high risk and low risk indicators
        is_high_risk = i % 2 == 0
        
        patient = {
            'age_at_diagnosis': 75 if is_high_risk else 35,
            'therapy_type': 'chemotherapy' if is_high_risk else 'surgery',
            'id_histology_type': 1,
            'pathological_m_id': 15 if is_high_risk else 14, # 15=M1, 14=M0
            'clinical_m_id': 14,
            'pathological_n_id': 13 if is_high_risk else 7, # 13=N3b, 7=N0
            'clinical_n_id': 7,
            'is_alive': not is_high_risk,
            'diagnosis_date': '2018-06-15',
            'death_date': '2020-01-01' if is_high_risk else None,
            'last_follow_up': '2020-01-01' if is_high_risk else '2024-01-01',
            'recidive': is_high_risk,
            'date_of_recidive': '2019-01-01' if is_high_risk else None,
            'date_of_first_post_treatment_follow_up': '2018-06-01'
        }
        patients.append(patient)
    return patients

def run_ml_engine(input_data):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_engine_path = os.path.join(script_dir, 'ml_engine.py')
    result = subprocess.run(
        ['python3', ml_engine_path],
        input=json.dumps(input_data),
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None
    return json.loads(result.stdout)

def main():
    print("Running Sanity Check...")
    
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as f:
        model_path = f.name

    # 1. Train
    patients = create_mock_data()
    train_input = {
        'mode': 'train',
        'model_type': 'recurrence',
        'algorithm': 'rsf',
        'model_path': model_path,
        'data': {'patients': patients}
    }
    
    train_result = run_ml_engine(train_input)
    if not train_result or not train_result['success']:
        print("Training failed")
        return

    # 2. Predict Low Risk
    low_risk_patient = {
        'age_at_diagnosis': 30,
        'therapy_type': 'surgery',
        'id_histology_type': 1,
        'pathological_m_id': 14,
        'pathological_n_id': 7,
        'diagnosis_date': '2020-06-15',
    }
    
    predict_low = run_ml_engine({
        'mode': 'predict',
        'model_type': 'recurrence',
        'model_path': model_path,
        'data': {'patient': low_risk_patient}
    })

    # 3. Predict High Risk
    high_risk_patient = {
        'age_at_diagnosis': 85,
        'therapy_type': 'chemotherapy',
        'id_histology_type': 1,
        'pathological_m_id': 15,
        'pathological_n_id': 13,
        'diagnosis_date': '2020-06-15',
    }
    
    predict_high = run_ml_engine({
        'mode': 'predict',
        'model_type': 'recurrence',
        'model_path': model_path,
        'data': {'patient': high_risk_patient}
    })

    # 4. Compare
    low_score = predict_low['result']['risk_score']
    high_score = predict_high['result']['risk_score']
    
    print(f"Low-risk patient score: {low_score:.4f}")
    print(f"High-risk patient score: {high_score:.4f}")
    
    if high_score > low_score:
        print("✓ PASS: High-risk patient has a higher risk score.")
    else:
        print("✗ FAIL: High-risk patient does NOT have a higher risk score.")

    # 5. Check probabilities
    prob_1y = predict_high['result']['recurrence_probability_1year']
    prob_5y = predict_high['result']['recurrence_probability_5year']
    
    print(f"High-risk 1-year recurrence: {prob_1y:.4f}")
    print(f"High-risk 5-year recurrence: {prob_5y:.4f}")
    
    if prob_5y >= prob_1y:
        print("✓ PASS: 5-year recurrence prob is >= 1-year recurrence prob.")
    else:
        print("✗ FAIL: 5-year recurrence prob is lower than 1-year.")

    if os.path.exists(model_path):
        os.remove(model_path)

if __name__ == "__main__":
    main()
