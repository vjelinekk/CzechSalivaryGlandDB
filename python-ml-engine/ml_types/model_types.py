from typing import TypedDict

from sksurv.ensemble import RandomSurvivalForest
from sksurv.linear_model import CoxPHSurvivalAnalysis

from feature_extractor import FeatureExtractor
from ml_types import AlgorithmTypeEnum, ModelTypeEnum


class TrainResultMetadata(TypedDict):
    """
    Structure of training result data from ML engine
    """
    c_index: float                  # Apparent C-index (training set, optimistically biased)
    bootstrap_c_index: float        # .632-corrected bootstrap C-index (honest generalisation estimate)
    bootstrap_c_index_std: float    # Std of raw OOB C-indices across bootstrap iterations
    bootstrap_n_valid: int          # Number of successful bootstrap iterations (out of n_bootstrap)
    n_samples: int
    n_events: int
    training_date: str
    algorithm: AlgorithmTypeEnum
    model_type: ModelTypeEnum
    feature_names: list[str]

class SavedTrainedModel(TypedDict):
    """
    Structure of saved model file content
    """
    model: CoxPHSurvivalAnalysis | RandomSurvivalForest
    algorithm: AlgorithmTypeEnum
    metadata: TrainResultMetadata
    extractor: FeatureExtractor
    feature_importance: list[float]

class RiskFactor(TypedDict):
    """
    Structure for a single risk factor with importance score
    """
    feature: str
    importance: float


class BasePredictionResult(TypedDict):
    """
    Base structure for prediction results
    """
    risk_score: float
    top_risk_factors: list[RiskFactor]


class SurvivalPredictionResult(BasePredictionResult):
    """
    Prediction result structure for survival models (RSF and CoxPH)
    """
    survival_probability_1year: float
    survival_probability_3year: float
    survival_probability_5year: float


class RecurrencePredictionResult(BasePredictionResult):
    """
    Prediction result structure for recurrence models (RSF and CoxPH)
    """
    recurrence_probability_1year: float
    recurrence_probability_3year: float
    recurrence_probability_5year: float
    recurrence_free_probability_1year: float
    recurrence_free_probability_3year: float
    recurrence_free_probability_5year: float

class ModelInfoResult(TypedDict):
    """
    Structure for model info result
    """
    model_metadata: TrainResultMetadata