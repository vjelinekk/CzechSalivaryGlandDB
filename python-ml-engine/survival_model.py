"""
Survival analysis models using scikit-survival
Supports Random Survival Forest and Cox Proportional Hazards
"""

import sys
import numpy as np
import pandas as pd
import joblib
from sksurv.ensemble import RandomSurvivalForest
from sksurv.linear_model import CoxPHSurvivalAnalysis
from sksurv.metrics import concordance_index_censored
from sklearn.inspection import permutation_importance

from feature_extractor import FeatureExtractor
from ml_types import AlgorithmTypeEnum, ModelTypeEnum
from ml_types.model_types import TrainResultMetadata, SavedTrainedModel, SurvivalPredictionResult, \
    RecurrencePredictionResult


class SurvivalModel:
    """Wrapper for survival analysis models"""

    def __init__(self, algorithm: AlgorithmTypeEnum = AlgorithmTypeEnum.RSF):
        """
        Initialize model

        Args:
            algorithm: 'rsf' (Random Survival Forest) or 'coxph' (Cox Proportional Hazards)
        """
        self.algorithm = algorithm
        self.feature_importance_ = None  # Stored importance (calculated via permutation for RSF)

        if algorithm == AlgorithmTypeEnum.RSF:
            self.model = RandomSurvivalForest(
                n_estimators=500,
                min_samples_split=10,
                min_samples_leaf=5,
                max_depth=5,
                random_state=42,
                n_jobs=-1
            )
        elif algorithm == AlgorithmTypeEnum.COXPH:
            self.model = CoxPHSurvivalAnalysis(
                alpha=0.1,  # L2 regularization
                ties='efron',
                n_iter=100
            )
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

    def fit(self, X, y_event, y_time):
        """
        Train the survival model

        Args:
            X: Feature matrix (n_patients, n_features)
            y_event: Event indicator (1=event, 0=censored)
            y_time: Time to event or censoring
        """
        # Validate minimum samples
        n_samples = len(X)
        n_events = int(sum(y_event))

        if n_samples < 50:
            raise ValueError(f"Insufficient training data: {n_samples} patients (need at least 50)")
        if n_events < 15:
            raise ValueError(f"Insufficient events: {n_events} events (need at least 15)")

        # Create structured array for scikit-survival
        y = np.array(
            [(bool(event), float(time)) for event, time in zip(y_event, y_time)],
            dtype=[('event', bool), ('time', float)]
        )

        # Fit model
        self.model.fit(X, y)

    def calculate_feature_importance(self, X, y_event, y_time, n_repeats=10):
        """Calculate feature importance using permutation

        For RSF: Uses permutation_importance (recommended by scikit-survival)
        For CoxPH: Uses absolute coefficient values

        Args:
            X: Feature matrix used for training
            y_event: Event indicator
            y_time: Time to event
            n_repeats: Number of permutations (default 10 for speed)
        """
        if self.algorithm == AlgorithmTypeEnum.RSF:
            # Use permutation importance for Random Survival Forest
            y = np.array(
                [(bool(event), time) for event, time in zip(y_event, y_time)],
                dtype=[('event', bool), ('time', float)]
            )
            result = permutation_importance(
                self.model, X, y,
                n_repeats=n_repeats,
                random_state=42
            )
            self.feature_importance_ = result.importances_mean
        elif self.algorithm == AlgorithmTypeEnum.COXPH:
            # For Cox PH, use absolute coefficient values
            self.feature_importance_ = np.abs(self.model.coef_)

    def predict_risk(self, X, model_type: ModelTypeEnum = ModelTypeEnum.RECURRENCE) -> SurvivalPredictionResult | RecurrencePredictionResult:
        """
        Predict risk score for patient(s)

        Args:
            X: Feature matrix
            model_type: 'overall_survival' or 'recurrence'

        Returns:
            dict with risk_score and probabilities (survival or recurrence-free)
        """
        # Get survival function
        survival_funcs = self.model.predict_survival_function(X)

        # Times: 1 year (365d), 3 years (1095d), 5 years (1825d)
        surv_prob_1y = self._get_survival_prob(survival_funcs[0], 365)
        surv_prob_3y = self._get_survival_prob(survival_funcs[0], 1095)
        surv_prob_5y = self._get_survival_prob(survival_funcs[0], 1825)

        # Risk score = 1 - 5-year survival/recurrence-free probability
        risk_score = 1.0 - surv_prob_5y

        # Adjust output keys based on model type
        if model_type == ModelTypeEnum.RECURRENCE:
            # For recurrence models, survival prob = recurrence-free prob
            # Most users want to see recurrence probability, not recurrence-free
            result: RecurrencePredictionResult = {
                'risk_score': float(risk_score),
                'recurrence_probability_1year': float(1.0 - surv_prob_1y),
                'recurrence_probability_3year': float(1.0 - surv_prob_3y),
                'recurrence_probability_5year': float(1.0 - surv_prob_5y),
                'recurrence_free_probability_1year': float(surv_prob_1y),
                'recurrence_free_probability_3year': float(surv_prob_3y),
                'recurrence_free_probability_5year': float(surv_prob_5y)
            }
            return result
        else:
            # For overall survival models
            result: SurvivalPredictionResult = {
                'risk_score': float(risk_score),
                'survival_probability_1year': float(surv_prob_1y),
                'survival_probability_3year': float(surv_prob_3y),
                'survival_probability_5year': float(surv_prob_5y)
            }
            return result

    def _get_survival_prob(self, survival_func, time_days):
        """
        Get survival probability at a specific time point

        Args:
            survival_func: StepFunction from predict_survival_function
            time_days: Time point in days

        Returns:
            Survival probability at time_days
        """
        try:
            return survival_func(time_days)
        except:
            # If time is beyond the range, return the last available value
            if hasattr(survival_func, 'x') and hasattr(survival_func, 'y'):
                if len(survival_func.x) > 0:
                    return survival_func.y[-1]
            return 0.5  # Default fallback

    def get_c_index(self, X, y_event, y_time):
        """Calculate concordance index (model performance)"""
        y = np.array(
            [(bool(event), float(time)) for event, time in zip(y_event, y_time)],
            dtype=[('event', bool), ('time', float)]
        )

        # Get risk scores
        risk_scores = self.model.predict(X)

        # Calculate C-index
        result = concordance_index_censored(
            y['event'], y['time'], risk_scores
        )
        c_index = result[0]

        return float(c_index)

    def get_feature_importance(self):
        """Get feature importance scores

        Returns the stored feature importance calculated during training.
        For RSF: Uses permutation importance (calculated via calculate_feature_importance)
        For CoxPH: Uses absolute coefficient values

        Returns empty array if importance was not calculated.
        """
        if self.feature_importance_ is not None:
            return self.feature_importance_
        elif self.algorithm == AlgorithmTypeEnum.COXPH:
            # For CoxPH, can calculate on-the-fly from coefficients
            return np.abs(self.model.coef_)
        else:
            return np.array([])

    def get_local_feature_importance(self, X):
        """Get local (per-patient) feature importance

        For CoxPH: exact contributions as coef * feature_value for this patient.
                   Positive = increases risk, negative = decreases risk.
        For RSF: falls back to global permutation importance (no local support).

        Args:
            X: Feature matrix for a single patient (1, n_features)

        Returns:
            numpy array of importance values (n_features,)
        """
        if self.algorithm == AlgorithmTypeEnum.COXPH:
            return self.model.coef_ * X[0]
        else:
            return self.get_feature_importance()

    def save(self, model_path: str, metadata: TrainResultMetadata, extractor: FeatureExtractor) -> None:
        """
        Save model, metadata, and feature extractor

        Saves as a dictionary with:
            - model: trained model object
            - metadata: training info (c_index, n_samples, etc.)
            - extractor: fitted FeatureExtractor
            - feature_importance: calculated feature importance scores
        """
        save_dict: SavedTrainedModel = {
            'model': self.model,
            'algorithm': self.algorithm,
            'metadata': metadata,
            'extractor': extractor,
            'feature_importance': self.feature_importance_
        }
        joblib.dump(save_dict, model_path)

    @staticmethod
    def load(model_path) -> tuple['SurvivalModel', 'FeatureExtractor', TrainResultMetadata]:
        """
        Load model from disk

        Returns:
            (SurvivalModel, FeatureExtractor, metadata)
        """
        save_dict: SavedTrainedModel = joblib.load(model_path)

        # Reconstruct SurvivalModel
        survival_model = SurvivalModel(algorithm=save_dict['algorithm'])
        survival_model.model = save_dict['model']
        survival_model.feature_importance_ = save_dict.get('feature_importance')  # May be None for old models

        return survival_model, save_dict['extractor'], save_dict['metadata']


def bootstrap_validate(
    patients: list,
    model_type: ModelTypeEnum,
    algorithm: AlgorithmTypeEnum,
    c_apparent: float,
    n_bootstrap: int = 200,
    random_state: int = 42,
) -> dict:
    """
    Estimate generalisation performance via bootstrap and return the .632 corrected C-index.

    Each iteration:
      1. Draw N patients with replacement (bootstrap sample, ~63.2% unique).
      2. Out-of-bag (OOB) patients are those never drawn (~36.8%).
      3. Fit a fresh extractor + model on the bootstrap sample.
      4. Evaluate C-index on OOB patients.

    The .632 estimator corrects for the pessimistic bias of plain OOB evaluation:
        C_632 = 0.368 * C_apparent + 0.632 * mean(C_oob)

    Where C_apparent is the training-set C-index (already computed by the caller).

    Returns:
        {
          'bootstrap_c_index':     float  — .632-corrected C-index (the main metric),
          'bootstrap_c_index_std': float  — std of raw OOB C-indices (spread estimate),
        }
    """
    rng = np.random.default_rng(random_state)
    n = len(patients)
    oob_c_indices = []
    skipped = 0

    for iteration in range(n_bootstrap):
        boot_idx = rng.integers(0, n, size=n)
        oob_idx = np.setdiff1d(np.arange(n), boot_idx)

        if len(oob_idx) < 5:
            skipped += 1
            continue

        boot_patients = [patients[i] for i in boot_idx]
        oob_patients  = [patients[i] for i in oob_idx]

        try:
            # Fit a fresh extractor on the bootstrap sample only
            extractor = FeatureExtractor()
            X_boot, y_event_boot, y_time_boot, _ = extractor.fit_transform(
                boot_patients, model_type
            )

            if sum(y_event_boot) < 2:
                skipped += 1
                continue

            # Transform OOB features using the bootstrap-fitted extractor
            X_oob = extractor.transform(oob_patients)

            # Extract OOB targets (no fitting — extractor already fitted above)
            oob_df = pd.DataFrame(oob_patients)
            oob_df = extractor._apply_stage_fallback(oob_df)
            y_event_oob, y_time_oob = extractor.extract_targets(oob_df, model_type)

            # Drop OOB patients with unresolvable time
            valid = ~np.isnan(y_time_oob)
            if valid.sum() < 5 or sum(y_event_oob[valid]) < 2:
                skipped += 1
                continue

            X_oob        = X_oob[valid]
            y_event_oob  = y_event_oob[valid]
            y_time_oob   = y_time_oob[valid]

            # Fit model on bootstrap sample and evaluate on OOB
            model = SurvivalModel(algorithm=algorithm)
            model.fit(X_boot, y_event_boot, y_time_boot)
            c_oob = model.get_c_index(X_oob, y_event_oob, y_time_oob)
            oob_c_indices.append(c_oob)

        except Exception as exc:
            skipped += 1
            print(
                f"[bootstrap] Iteration {iteration} skipped: {exc}",
                file=sys.stderr,
            )

    if skipped > 0:
        print(
            f"[bootstrap] {skipped}/{n_bootstrap} iterations skipped "
            f"(too few OOB events or model error).",
            file=sys.stderr,
        )

    if not oob_c_indices:
        # Could not complete any iteration — fall back to apparent C-index
        print(
            "[bootstrap] No valid OOB iterations — returning apparent C-index as fallback.",
            file=sys.stderr,
        )
        return {
            'bootstrap_c_index':     float(c_apparent),
            'bootstrap_c_index_std': 0.0,
        }

    oob_mean = float(np.mean(oob_c_indices))
    oob_std  = float(np.std(oob_c_indices))
    c_632    = float(0.368 * c_apparent + 0.632 * oob_mean)

    return {
        'bootstrap_c_index':     c_632,
        'bootstrap_c_index_std': oob_std,
    }
