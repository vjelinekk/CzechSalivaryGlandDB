# Model Validation — CSGDB Survival Models

Offline validation of four pretrained survival models for the Czech Salivary Gland Database.
Results are reported in `main.ipynb` and summarised here.

---

## Dataset

| Property | Value |
|---|---|
| Patients | 122 |
| Recurrence events | 25 |
| Death events | 33 |
| Predictors | 7 (age, positive node count, T-stage, grade, lymphatic invasion, perineural invasion, extranodal extension) |
| Source | `data/patients.json` |

---

## Models

| Key | Algorithm | Endpoint |
|---|---|---|
| `recurrence_rsf` | Random Survival Forest | Recurrence-free survival (primary) |
| `recurrence_coxph` | Cox Proportional Hazards | Recurrence-free survival (primary) |
| `survival_rsf` | Random Survival Forest | Overall survival (secondary) |
| `survival_coxph` | Cox Proportional Hazards | Overall survival (secondary) |

Pretrained `.joblib` files are in `../pretrained-models/`.

---

## Validation Methodology

### Metrics

| Metric | Method | Notes |
|---|---|---|
| C-index | Apparent + .632 bootstrap (200 iterations) | Primary discrimination metric |
| IBS | Apparent + .632 bootstrap (200 iterations) | Integrated Brier Score; null model benchmark = 0.25 |
| Calibration intercept + slope | Apparent + .632 bootstrap; logistic regression at t\* = 365 days | Target: intercept = 0, slope = 1 |
| Schoenfeld residuals | Once on full dataset via `lifelines.CoxPHFitter` | CoxPH models only; tests proportional hazards assumption |
| Feature importance | Permutation importance on training data (10 repeats) | RSF models only |

### Bootstrap .632 Estimator

Corrects for the optimistic bias of apparent (training-set) metrics:

```
metric_632 = 0.368 × metric_apparent + 0.632 × mean(metric_OOB)
```

A single master loop evaluates all metrics (C-index, IBS, calibration) in one pass across 200 bootstrap iterations to avoid redundant computation.

### Calibration

Weak calibration (intercept and slope) is evaluated via logistic regression of the binary observed outcome on `logit(predicted event probability)` at t\* = 365 days. Patients censored before t\* are excluded.

Calibration **curves** are not reported. Per Van Calster et al. (2019), a minimum of 200 events is required for a reliable calibration curve. With 25–33 events, only intercept and slope are reported.

---

## Results

### Recurrence Models (Primary)

| Metric | RSF Apparent | RSF .632 Boot | CoxPH Apparent | CoxPH .632 Boot |
|---|---|---|---|---|
| C-index | 0.8708 | 0.8139 ± 0.0668 | 0.8353 | 0.7826 ± 0.0871 |
| IBS | 0.0858 | 0.1149 ± 0.0441 | 0.1069 | 0.1365 ± 0.0633 |
| Cal. Intercept (365d) | 1.3607 | 0.5028 ± 0.9633 | −0.0687 | −0.4106 ± 1.1816 |
| Cal. Slope (365d) | 2.2932 | 1.4846 ± 0.5626 | 0.8253 | 0.6385 ± 0.4872 |

**RSF is the better model**: higher C-index (0.81 vs 0.78) and lower IBS (0.11 vs 0.14) after bootstrap correction. Both models substantially outperform the null model (IBS = 0.25). Calibration estimates have wide standard deviations due to the small event count and should be interpreted cautiously.

### Overall Survival Models (Secondary)

| Metric | RSF Apparent | RSF .632 Boot | CoxPH Apparent | CoxPH .632 Boot |
|---|---|---|---|---|
| C-index | 0.8173 | 0.7607 ± 0.0606 | 0.7617 | 0.7246 ± 0.0752 |
| IBS | 0.1119 | 0.1535 ± 0.0539 | 0.1326 | 0.1688 ± 0.0608 |
| Cal. Intercept (365d) | — | — | — | — |
| Cal. Slope (365d) | — | — | — | — |

Calibration at 365 days was omitted for both survival models due to numerical instability (near-perfect separation in the logistic regression caused by very low predicted 1-year death probabilities), consistent with the favourable short-term prognosis of salivary gland cancer.

RSF again outperforms CoxPH. Survival model C-indices are slightly lower than recurrence model C-indices, consistent with overall survival being a harder endpoint due to competing causes of death.

---

## Schoenfeld Residuals — Recurrence CoxPH

| Predictor | p (rank-time) | p (KM-time) | Result |
|---|---|---|---|
| age_at_diagnosis | 0.3513 | 0.4508 | ✓ No violation |
| positive_node_count | 0.3393 | 0.4797 | ✓ No violation |
| t_stage | 0.7556 | 0.8476 | ✓ No violation |
| grade | 0.7288 | 0.8471 | ✓ No violation |
| lymphatic_invasion | 0.5594 | 0.6201 | ✓ No violation |
| perineural_invasion | 0.5960 | 0.4363 | ✓ No violation |
| extranodal_extension | 0.4655 | 0.5167 | ✓ No violation |

**The proportional hazards assumption holds for all predictors** (all p ≥ 0.34). The CoxPH model is mathematically valid for this dataset.

The survival CoxPH model was not tested; as the secondary model it is not the primary subject of clinical validation.

---

## Feature Importance — RSF Models

Permutation importance: mean decrease in C-index when each feature is randomly shuffled (10 repeats, training data).

### Recurrence RSF

| Feature | Importance | Relative % |
|---|---|---|
| age_at_diagnosis | 0.0379 | 27.7% |
| lymphatic_invasion | 0.0319 | 23.4% |
| perineural_invasion | 0.0271 | 19.8% |
| positive_node_count | 0.0188 | 13.7% |
| t_stage | 0.0111 | 8.1% |
| grade | 0.0095 | 7.0% |
| extranodal_extension | 0.0005 | 0.3% |

### Overall Survival RSF

| Feature | Importance | Relative % |
|---|---|---|
| age_at_diagnosis | 0.0705 | 39.7% |
| lymphatic_invasion | 0.0322 | 18.1% |
| positive_node_count | 0.0238 | 13.4% |
| t_stage | 0.0196 | 11.0% |
| grade | 0.0177 | 9.9% |
| perineural_invasion | 0.0112 | 6.3% |
| extranodal_extension | 0.0028 | 1.6% |

Importance is distributed across all features with no single predictor dominating. Age has higher relative importance in the survival model (40% vs 28%), reflecting the contribution of age-related comorbidities to mortality beyond cancer-specific factors. The feature rankings are consistent with established prognostic factors in salivary gland malignancies.

---

## Key Limitations

1. **Low EPV (Events Per Variable):** 25 recurrence events across 7 predictors yields ~3.6 EPV, below the recommended minimum of 10. All metrics should be interpreted as preliminary.
2. **Internal validation only:** Bootstrap .632 is optimism-corrected internal validation. External validation in an independent cohort is required before clinical deployment.
3. **Calibration instability:** Wide standard deviations on calibration metrics reflect the small event count. Calibration conclusions are limited to direction, not magnitude.
4. **No survival calibration:** Numerical instability prevented calibration assessment for overall survival models at the 1-year horizon.
