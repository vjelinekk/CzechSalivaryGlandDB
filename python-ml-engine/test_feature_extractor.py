#!/usr/bin/env python3
"""
Unit tests for FeatureExtractor

Covers:
  - _parse_t_stage     — T-code string → ordinal float
  - _parse_grade       — stage string → ordinal float
  - _apply_stage_fallback — pathological / clinical fallback logic
  - _calculate_survival_time   — days from diagnosis to death or last follow-up
  - _calculate_recurrence_time — days from treatment to recurrence or last follow-up
  - extract_targets    — routing between overall_survival and recurrence targets
"""

import numpy as np
import pandas as pd
import pytest

from feature_extractor import FeatureExtractor


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_extractor() -> FeatureExtractor:
    """Return a fresh FeatureExtractor (no fitting needed for pure logic tests)."""
    return FeatureExtractor()


def _df(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# _parse_t_stage
# ---------------------------------------------------------------------------

class TestParseTStage:
    def test_t1(self):
        assert FeatureExtractor._parse_t_stage("T1") == 1.0

    def test_t2(self):
        assert FeatureExtractor._parse_t_stage("T2") == 2.0

    def test_t3(self):
        assert FeatureExtractor._parse_t_stage("T3") == 3.0

    def test_t4(self):
        assert FeatureExtractor._parse_t_stage("T4") == 4.0

    def test_t4a_maps_to_4(self):
        assert FeatureExtractor._parse_t_stage("T4a") == 4.0

    def test_t4b_maps_to_4(self):
        assert FeatureExtractor._parse_t_stage("T4b") == 4.0

    def test_lowercase(self):
        assert FeatureExtractor._parse_t_stage("t2") == 2.0

    def test_tx_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_t_stage("TX"))

    def test_none_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_t_stage(None))

    def test_empty_string_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_t_stage(""))

    def test_unknown_code_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_t_stage("T9"))

    def test_whitespace_stripped(self):
        assert FeatureExtractor._parse_t_stage("  T3  ") == 3.0


# ---------------------------------------------------------------------------
# _parse_grade
# ---------------------------------------------------------------------------

class TestParseGrade:
    def test_stage_i(self):
        assert FeatureExtractor._parse_grade("Stage I") == 1.0

    def test_stage_ii(self):
        assert FeatureExtractor._parse_grade("Stage II") == 2.0

    def test_stage_iii(self):
        assert FeatureExtractor._parse_grade("Stage III") == 3.0

    def test_stage_iva(self):
        assert FeatureExtractor._parse_grade("Stage IVA") == 4.0

    def test_stage_ivb(self):
        assert FeatureExtractor._parse_grade("Stage IVB") == 5.0

    def test_stage_ivc(self):
        assert FeatureExtractor._parse_grade("Stage IVC") == 6.0

    def test_stage_iv_edition2_fallback(self):
        # Edition 2 uses 'Stage IV' without suffix → should map to 4
        assert FeatureExtractor._parse_grade("Stage IV") == 4.0

    def test_case_insensitive(self):
        assert FeatureExtractor._parse_grade("stage iii") == 3.0

    def test_none_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_grade(None))

    def test_empty_string_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_grade(""))

    def test_unknown_code_returns_nan(self):
        assert np.isnan(FeatureExtractor._parse_grade("Grade 2"))

    def test_whitespace_stripped(self):
        assert FeatureExtractor._parse_grade("  Stage II  ") == 2.0


# ---------------------------------------------------------------------------
# _apply_stage_fallback
# ---------------------------------------------------------------------------

class TestApplyStageFallback:
    def setup_method(self):
        self.extractor = make_extractor()

    def test_pathological_t_preferred(self):
        df = _df([{"pathological_t_code": "T2", "clinical_t_code": "T3"}])
        result = self.extractor._apply_stage_fallback(df)
        assert result["t_stage"].iloc[0] == 2.0

    def test_clinical_t_fallback_when_pathological_missing(self):
        df = _df([{"pathological_t_code": None, "clinical_t_code": "T3"}])
        result = self.extractor._apply_stage_fallback(df)
        assert result["t_stage"].iloc[0] == 3.0

    def test_clinical_t_fallback_when_pathological_empty_string(self):
        df = _df([{"pathological_t_code": "", "clinical_t_code": "T1"}])
        result = self.extractor._apply_stage_fallback(df)
        assert result["t_stage"].iloc[0] == 1.0

    def test_t_stage_nan_when_both_missing(self):
        df = _df([{"pathological_t_code": None, "clinical_t_code": None}])
        result = self.extractor._apply_stage_fallback(df)
        assert np.isnan(result["t_stage"].iloc[0])

    def test_t_stage_nan_when_columns_absent(self):
        df = _df([{"age_at_diagnosis": 50}])
        result = self.extractor._apply_stage_fallback(df)
        assert np.isnan(result["t_stage"].iloc[0])

    def test_pathological_grade_preferred(self):
        df = _df([{"pathological_grade_code": "Stage I", "clinical_grade_code": "Stage III"}])
        result = self.extractor._apply_stage_fallback(df)
        assert result["grade"].iloc[0] == 1.0

    def test_clinical_grade_fallback_when_pathological_missing(self):
        df = _df([{"pathological_grade_code": None, "clinical_grade_code": "Stage II"}])
        result = self.extractor._apply_stage_fallback(df)
        assert result["grade"].iloc[0] == 2.0

    def test_grade_nan_when_both_missing(self):
        df = _df([{"pathological_grade_code": None, "clinical_grade_code": None}])
        result = self.extractor._apply_stage_fallback(df)
        assert np.isnan(result["grade"].iloc[0])


# ---------------------------------------------------------------------------
# _calculate_survival_time
# ---------------------------------------------------------------------------

class TestCalculateSurvivalTime:
    def setup_method(self):
        self.extractor = make_extractor()

    def _calc(self, rows):
        return self.extractor._calculate_survival_time(_df(rows))

    def test_dead_patient_uses_death_date(self):
        times = self._calc([{
            "is_alive": False,
            "diagnosis_date": "2018-01-01",
            "death_date": "2020-01-01",
            "last_follow_up": "2023-01-01",
        }])
        # 2 years = 730 days
        assert times[0] == pytest.approx(730, abs=2)

    def test_alive_patient_uses_last_followup(self):
        times = self._calc([{
            "is_alive": True,
            "diagnosis_date": "2018-01-01",
            "death_date": None,
            "last_follow_up": "2023-01-01",
        }])
        # 5 years ≈ 1826 days
        assert times[0] > 1800

    def test_dead_patient_missing_death_date_falls_back_to_followup(self):
        times = self._calc([{
            "is_alive": False,
            "diagnosis_date": "2018-01-01",
            "death_date": None,
            "last_follow_up": "2021-01-01",
        }])
        assert times[0] > 0
        assert not np.isnan(times[0])

    def test_missing_diagnosis_date_returns_nan(self):
        times = self._calc([{
            "is_alive": False,
            "diagnosis_date": None,
            "death_date": "2020-01-01",
            "last_follow_up": "2020-01-01",
        }])
        assert np.isnan(times[0])

    def test_no_usable_end_date_returns_nan(self):
        times = self._calc([{
            "is_alive": True,
            "diagnosis_date": "2018-01-01",
            "death_date": None,
            "last_follow_up": None,
        }])
        assert np.isnan(times[0])

    def test_duration_clamped_to_minimum_one(self):
        # Same date for diagnosis and death → 0 days → clamped to 1
        times = self._calc([{
            "is_alive": False,
            "diagnosis_date": "2020-06-15",
            "death_date": "2020-06-15",
            "last_follow_up": "2020-06-15",
        }])
        assert times[0] == 1.0

    def test_multiple_patients_returned_in_order(self):
        rows = [
            {"is_alive": False, "diagnosis_date": "2018-01-01", "death_date": "2020-01-01", "last_follow_up": None},
            {"is_alive": True,  "diagnosis_date": "2018-01-01", "death_date": None, "last_follow_up": "2023-01-01"},
        ]
        times = self._calc(rows)
        assert len(times) == 2
        assert times[0] < times[1]


# ---------------------------------------------------------------------------
# _calculate_recurrence_time
# ---------------------------------------------------------------------------

class TestCalculateRecurrenceTime:
    def setup_method(self):
        self.extractor = make_extractor()

    def _calc(self, rows):
        return self.extractor._calculate_recurrence_time(_df(rows))

    def test_recurred_patient_uses_recurrence_date(self):
        times = self._calc([{
            "recidive": True,
            "date_of_first_post_treatment_follow_up": "2018-06-01",
            "date_of_recidive": "2020-06-01",
            "last_follow_up": "2023-01-01",
        }])
        # ~730 days from treatment to recurrence
        assert times[0] == pytest.approx(731, abs=2)

    def test_no_recurrence_uses_last_followup(self):
        times = self._calc([{
            "recidive": False,
            "date_of_first_post_treatment_follow_up": "2018-06-01",
            "date_of_recidive": None,
            "last_follow_up": "2023-06-01",
        }])
        assert times[0] > 1800

    def test_missing_treatment_date_falls_back_to_diagnosis_date(self):
        times = self._calc([{
            "recidive": False,
            "date_of_first_post_treatment_follow_up": None,
            "diagnosis_date": "2018-01-01",
            "date_of_recidive": None,
            "last_follow_up": "2022-01-01",
        }])
        assert not np.isnan(times[0])
        assert times[0] > 0

    def test_no_time_origin_returns_nan(self):
        times = self._calc([{
            "recidive": False,
            "date_of_first_post_treatment_follow_up": None,
            "diagnosis_date": None,
            "date_of_recidive": None,
            "last_follow_up": "2023-01-01",
        }])
        assert np.isnan(times[0])

    def test_no_end_date_returns_nan(self):
        times = self._calc([{
            "recidive": False,
            "date_of_first_post_treatment_follow_up": "2018-06-01",
            "date_of_recidive": None,
            "last_follow_up": None,
        }])
        assert np.isnan(times[0])

    def test_duration_clamped_to_minimum_one(self):
        times = self._calc([{
            "recidive": True,
            "date_of_first_post_treatment_follow_up": "2020-06-15",
            "date_of_recidive": "2020-06-15",
            "last_follow_up": "2020-06-15",
        }])
        assert times[0] == 1.0


# ---------------------------------------------------------------------------
# extract_targets
# ---------------------------------------------------------------------------

class TestExtractTargets:
    def setup_method(self):
        self.extractor = make_extractor()

    def _patients(self):
        return _df([
            {
                "is_alive": False, "diagnosis_date": "2018-01-01",
                "death_date": "2020-01-01", "last_follow_up": "2020-01-01",
                "recidive": True, "date_of_recidive": "2019-06-01",
                "date_of_first_post_treatment_follow_up": "2018-02-01",
            },
            {
                "is_alive": True, "diagnosis_date": "2019-01-01",
                "death_date": None, "last_follow_up": "2024-01-01",
                "recidive": False, "date_of_recidive": None,
                "date_of_first_post_treatment_follow_up": "2019-02-01",
            },
        ])

    def test_overall_survival_event_is_death(self):
        y_event, _ = self.extractor.extract_targets(self._patients(), "overall_survival")
        assert y_event[0] == 1  # dead
        assert y_event[1] == 0  # alive

    def test_recurrence_event_is_recidive(self):
        y_event, _ = self.extractor.extract_targets(self._patients(), "recurrence")
        assert y_event[0] == 1  # recurred
        assert y_event[1] == 0  # no recurrence

    def test_overall_survival_time_positive(self):
        _, y_time = self.extractor.extract_targets(self._patients(), "overall_survival")
        assert all(t > 0 for t in y_time)

    def test_recurrence_time_positive(self):
        _, y_time = self.extractor.extract_targets(self._patients(), "recurrence")
        assert all(t > 0 for t in y_time)

    def test_unknown_model_type_raises(self):
        with pytest.raises(ValueError, match="Unknown model_type"):
            self.extractor.extract_targets(self._patients(), "invalid_type")
