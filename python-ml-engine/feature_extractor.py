"""
Feature extraction and preprocessing for CSGDB patient data
Converts patient JSON records to ML-ready feature matrices
"""

from datetime import datetime
import sys
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

from ml_types import Patient, ModelTypeEnum


class FeatureExtractor:
    """Extracts and preprocesses clinical features from patient records"""

    def __init__(
        self,
        use_binary_features: bool = True,
        numeric_features_override: list[str] | None = None,
    ):
        self.feature_names = []
        self.numeric_features = []
        self.categorical_features = []
        self.binary_features = []
        self.imputer_numeric = None
        self.scaler = None
        self.use_binary_features = use_binary_features
        self.numeric_features_override = numeric_features_override

    def fit_transform(self, patients: list[Patient], model_type: ModelTypeEnum = ModelTypeEnum.OVERALL_SURVIVAL):
        """
        Fit extractors on training data and transform to feature matrix

        Args:
            patients: List of patient dictionaries
            model_type: 'overall_survival' or 'recurrence'

        Returns:
            X: numpy array (n_patients, n_features)
            y_event: numpy array (n_patients,) - 1=event occurred, 0=censored
            y_time: numpy array (n_patients,) - time in days
            feature_names: list of feature names
        """
        # Convert to DataFrame
        df = pd.DataFrame(patients)

        # Define feature columns
        self._define_features()

        # Derive ordinal t_stage and grade columns from string codes
        df = self._apply_stage_fallback(df)

        # Extract target variables first so patients with unresolvable time
        # can be excluded before fitting any preprocessors.
        y_event, y_time = self.extract_targets(df, model_type)

        # Drop patients whose outcome time could not be determined.
        # Imputing y_time would corrupt the survival model — exclude instead.
        valid_mask = ~np.isnan(y_time)
        n_dropped = int((~valid_mask).sum())
        if n_dropped > 0:
            print(
                f"[FeatureExtractor] Excluding {n_dropped} patient(s) with "
                f"unresolvable follow-up time from training.",
                file=sys.stderr,
                flush=True,
            )
        df = df[valid_mask].reset_index(drop=True)
        y_event = y_event[valid_mask]
        y_time = y_time[valid_mask]

        X = self._extract_numeric(df, fit=True)
        self._build_feature_names()

        return X, y_event, y_time, self.feature_names

    def transform(self, patients: list[Patient]):
        """Transform new data using fitted extractors"""
        df = pd.DataFrame(patients)
        df = self._apply_stage_fallback(df)
        return self._extract_numeric(df, fit=False)

    def _define_features(self):
        """Define which columns are numeric vs categorical

        7-FEATURE MODEL:
        1. age_at_diagnosis (numeric)
        2. positive_node_count (numeric)
        3. t_stage (categorical, ID) - uses pathological with fallback to clinical
        4. grade (categorical, ID) - uses pathological with fallback to clinical
        5. lymphatic_invasion (binary: 'yes'/'no'/None)
        6. perineural_invasion (binary: 'yes'/'no'/None)
        7. extranodal_extension (binary: 'yes'/'no'/None)
        """
        # Numeric features — overridable via numeric_features_override
        if self.numeric_features_override is not None:
            self.numeric_features = list(self.numeric_features_override)
        else:
            self.numeric_features = [
                'age_at_diagnosis',
                'positive_node_count',
                't_stage',   # ordinal: T1=1, T2=2, T3=3, T4=4  (derived by _apply_stage_fallback)
                'grade',     # ordinal: Stage I=1 … Stage IVC=6  (derived by _apply_stage_fallback)
            ]

        # No categorical (OHE) features — t_stage and grade are ordinal numerics
        self.categorical_features = []

        # 3 binary features (omitted when use_binary_features=False)
        self.binary_features = (
            ['lymphatic_invasion', 'perineural_invasion', 'extranodal_extension']
            if self.use_binary_features else []
        )

    def _extract_numeric(self, df, fit=False):
        """Extract and preprocess numeric and binary features"""
        # Convert binary 'yes'/'no' columns to 0/1 numeric
        df = df.copy()
        for col in self.binary_features:
            if col not in df.columns:
                df[col] = np.nan
            else:
                df[col] = df[col].map(lambda v: 1.0 if v == 'yes' else (0.0 if v == 'no' else np.nan))

        all_numeric_cols = self.numeric_features + self.binary_features

        # Handle missing numeric columns by filling with NaN
        for col in self.numeric_features:
            if col not in df.columns:
                df[col] = np.nan

        X_numeric = df[all_numeric_cols].values.astype(float)

        # Handle missing values via median imputation
        if fit:
            self.imputer_numeric = SimpleImputer(strategy='median')
            X_numeric = self.imputer_numeric.fit_transform(X_numeric)

            # Standardize (z-score normalization)
            self.scaler = StandardScaler()
            X_numeric = self.scaler.fit_transform(X_numeric)
        else:
            X_numeric = self.imputer_numeric.transform(X_numeric)
            X_numeric = self.scaler.transform(X_numeric)

        return X_numeric

    @staticmethod
    def _parse_t_stage(code) -> float:
        """Convert T-stage string code to ordinal integer.

        Handles edition 1 (TX, T1, T2, T3, T4a, T4b) and
        edition 2 (T1, T2, T3, T4). TX → NaN (unassessable).
        T4a and T4b are both mapped to 4.
        """
        if not code or pd.isna(code):
            return np.nan
        c = str(code).strip().upper()
        if c.startswith('T1'): return 1.0
        if c.startswith('T2'): return 2.0
        if c.startswith('T3'): return 3.0
        if c.startswith('T4'): return 4.0
        return np.nan  # TX or unrecognised

    @staticmethod
    def _parse_grade(code) -> float:
        """Convert overall stage string code to ordinal integer.

        Maps: Stage I→1, Stage II→2, Stage III→3,
              Stage IVA→4, Stage IVB→5, Stage IVC→6.
        Edition 2 'Stage IV' (no suffix) maps to 4.
        """
        if not code or pd.isna(code):
            return np.nan
        c = str(code).strip().lower()
        mapping = {
            'stage i':    1.0,
            'stage ii':   2.0,
            'stage iii':  3.0,
            'stage iva':  4.0,
            'stage ivb':  5.0,
            'stage ivc':  6.0,
            'stage iv':   4.0,  # edition 2 fallback (no suffix)
        }
        return mapping.get(c, np.nan)

    def _apply_stage_fallback(self, df):
        """Derive ordinal t_stage and grade columns from string codes.

        Uses pathological code first, falls back to clinical if missing.
        Unknown or unassessable codes → NaN (handled by numeric imputer).
        """
        df = df.copy()

        # T stage: pathological preferred, clinical as fallback
        patho_t = df.get('pathological_t_code', pd.Series([None] * len(df)))
        clinic_t = df.get('clinical_t_code', pd.Series([None] * len(df)))
        raw_t = patho_t.where(patho_t.notna() & (patho_t != ''), clinic_t)
        df['t_stage'] = raw_t.map(self._parse_t_stage)

        # Overall stage (grade): pathological preferred, clinical as fallback
        patho_g = df.get('pathological_grade_code', pd.Series([None] * len(df)))
        clinic_g = df.get('clinical_grade_code', pd.Series([None] * len(df)))
        raw_g = patho_g.where(patho_g.notna() & (patho_g != ''), clinic_g)
        df['grade'] = raw_g.map(self._parse_grade)

        return df

    def extract_targets(self, df, model_type):
        """
        Extract survival target variables

        For overall_survival:
            event: 1 if dead, 0 if alive
            time: days from diagnosis to death or last_follow_up

        For recurrence:
            event: 1 if recurred, 0 if no recurrence
            time: days from treatment to recurrence or last_follow_up
        """
        if model_type == 'overall_survival':
            # Event: death (1) or alive/censored (0)
            y_event = (~df['is_alive'].fillna(True).astype(bool)).astype(int).values

            # Time: Calculate days from diagnosis to death or last follow-up
            y_time = self._calculate_survival_time(df)

        elif model_type == 'recurrence':
            # Event: recurrence (1) or no recurrence (0)
            y_event = df['recidive'].fillna(False).astype(bool).astype(int).values

            # Time: Calculate days from treatment to recurrence or last follow-up
            y_time = self._calculate_recurrence_time(df)

        else:
            raise ValueError(f"Unknown model_type: {model_type}")

        return y_event, y_time

    def _calculate_survival_time(self, df):
        """Calculate time in days from diagnosis to death or last follow-up.

        Returns np.nan for patients where time cannot be determined.
        These rows are excluded from training by fit_transform().
        """
        times = []

        for _, row in df.iterrows():
            # Get diagnosis date
            diagnosis_date_str = row.get('diagnosis_date')

            if not diagnosis_date_str or pd.isna(diagnosis_date_str):
                times.append(np.nan)
                continue

            try:
                diagnosis_date = pd.to_datetime(diagnosis_date_str)
            except (ValueError, TypeError):
                times.append(np.nan)
                continue

            # If patient died, use death date
            if not row.get('is_alive', True):
                death_date_str = row.get('death_date')
                if death_date_str and not pd.isna(death_date_str):
                    try:
                        death_date = pd.to_datetime(death_date_str)
                        days = (death_date - diagnosis_date).days
                        times.append(max(days, 1))
                        continue
                    except:
                        pass

            # Otherwise use last follow-up
            last_followup_str = row.get('last_follow_up')
            if last_followup_str and not pd.isna(last_followup_str):
                try:
                    last_followup = pd.to_datetime(last_followup_str)
                    days = (last_followup - diagnosis_date).days
                    times.append(max(days, 1))
                    continue
                except:
                    pass

            # Time cannot be determined — exclude this patient from training
            times.append(np.nan)

        return np.array(times, dtype=float)

    def _calculate_recurrence_time(self, df):
        """Calculate time in days from treatment to recurrence or last follow-up.

        Returns np.nan for patients where time cannot be determined.
        These rows are excluded from training by fit_transform().
        """
        times = []

        for _, row in df.iterrows():
            # Resolve the time origin: first post-treatment follow-up date,
            # falling back to Jan 1 of diagnosis year if unavailable.
            treatment_date_str = row.get('date_of_first_post_treatment_follow_up')
            treatment_date = None

            if treatment_date_str and not pd.isna(treatment_date_str):
                try:
                    treatment_date = pd.to_datetime(treatment_date_str)
                except:
                    pass

            if treatment_date is None:
                diagnosis_date_str = row.get('diagnosis_date')
                if diagnosis_date_str and not pd.isna(diagnosis_date_str):
                    try:
                        treatment_date = pd.to_datetime(diagnosis_date_str)
                    except:
                        pass

            if treatment_date is None:
                # Cannot establish a time origin — exclude this patient
                times.append(np.nan)
                continue

            # If recurrence occurred, use recurrence date
            if row.get('recidive', False):
                recurrence_date_str = row.get('date_of_recidive')
                if recurrence_date_str and not pd.isna(recurrence_date_str):
                    try:
                        recurrence_date = pd.to_datetime(recurrence_date_str)
                        days = (recurrence_date - treatment_date).days
                        times.append(max(days, 1))
                        continue
                    except:
                        pass

            # Otherwise use last follow-up
            last_followup_str = row.get('last_follow_up')
            if last_followup_str and not pd.isna(last_followup_str):
                try:
                    last_followup = pd.to_datetime(last_followup_str)
                    days = (last_followup - treatment_date).days
                    times.append(max(days, 1))
                    continue
                except:
                    pass

            # Time cannot be determined — exclude this patient from training
            times.append(np.nan)

        return np.array(times, dtype=float)

    def _build_feature_names(self):
        """Build human-readable feature names"""
        self.feature_names = list(self.numeric_features) + list(self.binary_features)
