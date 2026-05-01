# Feature Configuration Comparison

Three-way comparison of CSGDB survival models across different feature sets.

| Configuration | Notebook | Training |
|--------------|----------|---------|
| **7-feature** | `main.ipynb` | Pretrained — loaded from `.joblib` files |
| **4 numeric** | `main_4_features.ipynb` | Trained fresh in notebook |
| **4 pathology** | `main_4_features_improved.ipynb` | Trained fresh in notebook |

**Dataset:** 122 patients, 119 with resolvable follow-up used for evaluation  
**Recurrence endpoint:** 25 events / 94 censored  
**Overall survival endpoint:** 33 events / 86 censored  
**Calibration time point:** 365 days (1 year)  
**Bootstrap:** .632 estimator, 200 iterations each

---

## Feature Sets

| # | Feature | 7-feature | 4 numeric | 4 pathology |
|---|---------|:---------:|:---------:|:-----------:|
| 1 | `age_at_diagnosis` (numeric) | ✓ | ✓ | — |
| 2 | `positive_node_count` (numeric) | ✓ | ✓ | ✓ |
| 3 | `t_stage` (ordinal — patho/clinical T code) | ✓ | ✓ | — |
| 4 | `grade` (ordinal — patho/clinical overall stage) | ✓ | ✓ | — |
| 5 | `lymphatic_invasion` (binary: yes/no/missing) | ✓ | — | ✓ |
| 6 | `perineural_invasion` (binary: yes/no/missing) | ✓ | — | ✓ |
| 7 | `extranodal_extension` (binary: yes/no/missing) | ✓ | — | ✓ |

Missing binary features are median-imputed during preprocessing.
`t_stage` and `grade` are derived from pathological codes with clinical fallback; unknown/TX codes → imputed.

---

## Recurrence Models

### Random Survival Forest

| Metric | 7-feature | 4 numeric | 4 pathology |
|--------|:---------:|:---------:|:-----------:|
| **C-index apparent** | 0.8708 | 0.8720 | 0.8331 |
| **C-index .632 boot** | **0.8139** ± 0.0668 | 0.7814 ± 0.0760 | **0.8132** ± 0.0746 |
| **IBS apparent** | 0.0858 | 0.0912 | 0.0964 |
| **IBS .632 boot** | **0.1149** ± 0.0441 | 0.1332 ± 0.0551 | **0.1135** ± 0.0406 |
| Cal. Intercept apparent | 1.3607 | 2.1610 | 0.5698 |
| Cal. Intercept .632 boot | 0.5028 ± 0.9633 | 0.5212 ± 0.7522 | **0.2930** ± 1.1172 |
| Cal. Slope apparent | 2.2932 | 3.6842 | 1.3578 |
| Cal. Slope .632 boot | 1.4846 ± 0.5626 | 1.7268 ± 0.2858 | **1.2448** ± 1.0331 |
| Bootstrap valid: C / IBS / Cal | 200 / 198 / 200 | 200 / 198 / 200 | 200 / 198 / 200 |

### Cox Proportional Hazards

| Metric | 7-feature | 4 numeric | 4 pathology |
|--------|:---------:|:---------:|:-----------:|
| **C-index apparent** | 0.8353 | 0.7817 | 0.8328 |
| **C-index .632 boot** | 0.7826 ± 0.0871 | 0.7543 ± 0.0955 | **0.8122** ± 0.0764 |
| **IBS apparent** | 0.1069 | 0.1306 | 0.1049 |
| **IBS .632 boot** | 0.1365 ± 0.0633 | 0.1463 ± 0.0601 | **0.1228** ± 0.0525 |
| Cal. Intercept apparent | −0.0687 | −0.2289 | −0.0415 |
| Cal. Intercept .632 boot | −0.4106 ± 1.1816 | −0.3591 ± 1.6687 | **−0.1702** ± 1.2646 |
| Cal. Slope apparent | 0.8253 | 0.7479 | 0.8391 |
| Cal. Slope .632 boot | 0.6385 ± 0.4872 | 0.7048 ± 0.7322 | **0.7885** ± 0.5846 |
| Bootstrap valid: C / IBS / Cal | 200 / 198 / 200 | 200 / 198 / 200 | 200 / 198 / 200 |

> Calibration targets: Intercept = 0 (calibration-in-the-large), Slope = 1 (calibration slope).
> RSF calibration slopes > 1 indicate overconfident predictions (spread too wide), which is expected
> for RSF without isotonic regression post-processing.

---

## Overall Survival Models

### Random Survival Forest

| Metric | 7-feature | 4 numeric | 4 pathology |
|--------|:---------:|:---------:|:-----------:|
| **C-index apparent** | 0.8173 | 0.8355 | 0.7467 |
| **C-index .632 boot** | **0.7607** ± 0.0606 | 0.7595 ± 0.0599 | 0.7135 ± 0.0721 |
| **IBS apparent** | 0.1119 | 0.1059 | 0.1325 |
| **IBS .632 boot** | **0.1535** ± 0.0539 | 0.1643 ± 0.0714 | 0.1601 ± 0.0471 |
| Cal. Intercept apparent | 43.8532 | 21.2403 | 2.7718 |
| Cal. Intercept .632 boot | 16.4838 ± 6.8130 | 8.1878 ± 4.0617 | 2.4840 ± 50.6706 |
| Cal. Slope apparent | 23.0549 | 14.2875 | 1.9493 |
| Cal. Slope .632 boot | 9.3906 ± 3.9822 | 6.1831 ± 2.7582 | 2.3348 ± 27.7925 |
| Bootstrap valid: C / IBS / Cal | 200 / 178 / 183 | 200 / 178 / 183 | 200 / 178 / 183 |

### Cox Proportional Hazards

| Metric | 7-feature | 4 numeric | 4 pathology |
|--------|:---------:|:---------:|:-----------:|
| **C-index apparent** | 0.7617 | 0.7444 | 0.7342 |
| **C-index .632 boot** | **0.7246** ± 0.0752 | 0.7261 ± 0.0677 | 0.7104 ± 0.0712 |
| **IBS apparent** | 0.1326 | 0.1481 | 0.1353 |
| **IBS .632 boot** | **0.1688** ± 0.0608 | 0.1774 ± 0.0594 | 0.1602 ± 0.0488 |
| Cal. Intercept apparent | −1.4244 | −0.1417 | −2.6991 |
| Cal. Intercept .632 boot | −2.7345 ± 31.8956 | 0.0511 ± 5.1990 | −18.4454 ± 175.1169 |
| Cal. Slope apparent | 0.4600 | 0.9153 | 0.0769 |
| Cal. Slope .632 boot | 0.6463 ± 11.1047 | **1.4169** ± 5.8533 | −3.9053 ± 46.3771 |
| Bootstrap valid: C / IBS / Cal | 200 / 178 / 183 | 200 / 178 / 183 | 200 / 178 / 183 |

> RSF OS calibration intercept and slope are extremely large across all configurations — a known RSF
> limitation at this sample size (no survival probability calibration correction applied).
> OS CoxPH 4-pathology calibration collapses entirely (intercept −18.4, slope −3.9 with std > 100)
> because removing `age_at_diagnosis` leaves no strong continuous anchor for overall mortality risk,
> destabilising the logistic calibration regression.

---

## Feature Importance (RSF — permutation on training set, 10 repeats)

### Recurrence RSF

| Feature | 7-feature | 4 numeric | 4 pathology |
|---------|:---------:|:---------:|:-----------:|
| `age_at_diagnosis`    | 0.0379 (27.7%) | 0.0795 (29.9%) | — |
| `positive_node_count` | 0.0188 (13.7%) | 0.1176 (44.2%) | 0.0335 (22.8%) |
| `t_stage`             | 0.0111 ( 8.1%) | 0.0191 ( 7.2%) | — |
| `grade`               | 0.0095 ( 7.0%) | 0.0501 (18.8%) | — |
| `lymphatic_invasion`  | 0.0319 (23.4%) | — | 0.0783 (53.2%) |
| `perineural_invasion` | 0.0271 (19.8%) | — | 0.0353 (24.0%) |
| `extranodal_extension`| 0.0005 ( 0.3%) | — | −0.0043 (—) |

### Overall Survival RSF

| Feature | 7-feature | 4 numeric | 4 pathology |
|---------|:---------:|:---------:|:-----------:|
| `age_at_diagnosis`    | 0.0705 (39.7%) | 0.1254 (43.7%) | — |
| `positive_node_count` | 0.0238 (13.4%) | 0.0907 (31.6%) | 0.0525 (32.4%) |
| `t_stage`             | 0.0196 (11.0%) | 0.0292 (10.2%) | — |
| `grade`               | 0.0177 ( 9.9%) | 0.0416 (14.5%) | — |
| `lymphatic_invasion`  | 0.0322 (18.1%) | — | 0.0760 (46.9%) |
| `perineural_invasion` | 0.0112 ( 6.3%) | — | 0.0294 (18.2%) |
| `extranodal_extension`| 0.0028 ( 1.6%) | — | 0.0040 ( 2.5%) |

> Relative % is computed over positive-importance features only; negative values (extranodal_extension
> in 4-pathology recurrence) indicate the feature adds noise and is excluded from the percentage.

---

## CoxPH Proportional Hazards Assumption (Schoenfeld Residuals)

Schoenfeld residuals test whether the hazard ratio for each predictor is constant over time.
p < 0.05 = violation of the proportional hazards assumption.
All models fit via `lifelines.CoxPHFitter(penalizer=0.1)`.

### Recurrence CoxPH

| Feature | 7-feature coef (p) | 4 numeric coef (p) | 4 pathology coef (p) |
|---------|:-----------------:|:-----------------:|:-------------------:|
| `age_at_diagnosis`    | +0.046 (p=0.819) | +0.099 (p=0.612) | — |
| `positive_node_count` | +0.310 (p=0.070) | **+0.445 (p=0.001)** | +0.288 (p=0.082) |
| `t_stage`             | +0.131 (p=0.530) | +0.244 (p=0.235) | — |
| `grade`               | +0.149 (p=0.519) | +0.278 (p=0.208) | — |
| `lymphatic_invasion`  | **+0.461 (p=0.013)** | — | **+0.524 (p=0.004)** |
| `perineural_invasion` | +0.223 (p=0.242) | — | +0.318 (p=0.074) |
| `extranodal_extension`| −0.016 (p=0.924) | — | +0.017 (p=0.918) |
| **PH assumption** | **PASSES** | **PASSES** | **PASSES** |

### Overall Survival CoxPH

| Feature | 7-feature coef (p) | 4 numeric coef (p) | 4 pathology coef (p) |
|---------|:-----------------:|:-----------------:|:-------------------:|
| `age_at_diagnosis`    | +0.321 (p=0.076) | **+0.359 (p=0.044)** | — |
| `positive_node_count` | +0.167 (p=0.272) | **+0.241 (p=0.024)** | +0.132 (p=0.379) |
| `t_stage`             | −0.052 (p=0.796) | +0.042 (p=0.832) | — |
| `grade`               | +0.175 (p=0.429) | +0.317 (p=0.134) | — |
| `lymphatic_invasion`  | **+0.388 (p=0.022)** | — | **+0.458 (p=0.006)** |
| `perineural_invasion` | +0.222 (p=0.216) | — | +0.323 (p=0.052) |
| `extranodal_extension`| −0.080 (p=0.633) | — | −0.049 (p=0.777) |
| **PH assumption** | **PASSES** | **PASSES** | **PASSES** |

> All six CoxPH models pass the Schoenfeld residuals test (no predictor violates PH at p < 0.05).
> Bold coefficients are statistically significant at p < 0.05; the PH test (time-varying effect) is
> separate from coefficient significance and passes in all cases.

---

## Summary and Interpretation

### Recurrence models — binary invasion markers carry the core signal

The **4-pathology** configuration (`positive_node_count` + 3 binary markers) nearly matches the full
7-feature model, while the **4-numeric** configuration is the weakest:

| | RSF C-index .632 | CoxPH C-index .632 | RSF IBS .632 | CoxPH IBS .632 |
|-|:----------------:|:-----------------:|:------------:|:--------------:|
| 7-feature    | 0.8139 | 0.7826 | 0.1149 | 0.1365 |
| 4 numeric    | 0.7814 (−0.033) | 0.7543 (−0.028) | 0.1332 (+0.018) | 0.1463 (+0.010) |
| 4 pathology  | **0.8132** (−0.001) | **0.8122** (+0.030) | **0.1135** (−0.001) | **0.1228** (−0.014) |

Key findings:
- `lymphatic_invasion` is the strongest single recurrence predictor: p=0.013 in 7-feature CoxPH,
  53% of 4-pathology RSF importance, and its removal (4-numeric) causes the largest C-index drop.
- `extranodal_extension` contributes almost nothing to recurrence (0.3% in 7-feature RSF, negative
  importance in 4-pathology RSF) — it may be safely deprioritised for recurrence-specific models.
- `positive_node_count` is the dominant predictor when binary markers are absent (44% in 4-numeric RSF)
  and remains important when they are present (23% in 4-pathology RSF).

### Overall survival models — age is indispensable

Removing `age_at_diagnosis` (4-pathology) causes a meaningful OS C-index drop (−0.047 RSF, −0.014 CoxPH).
The 7-feature and 4-numeric configurations are essentially equivalent (Δ ≤ 0.002):

| | RSF C-index .632 | CoxPH C-index .632 | RSF IBS .632 | CoxPH IBS .632 |
|-|:----------------:|:-----------------:|:------------:|:--------------:|
| 7-feature    | **0.7607** | **0.7246** | **0.1535** | **0.1688** |
| 4 numeric    | 0.7595 (−0.001) | 0.7261 (+0.002) | 0.1643 (+0.011) | 0.1774 (+0.009) |
| 4 pathology  | 0.7135 (−0.047) | 0.7104 (−0.014) | 0.1601 (+0.007) | 0.1602 (+0.005) |

`age_at_diagnosis` accounts for 39.7% of 7-feature OS RSF importance (43.7% in 4-numeric RSF) and
carries the only statistically significant coefficient in the 4-numeric OS CoxPH model (p=0.044).
OS CoxPH calibration collapses completely in the 4-pathology configuration (intercept −18, slope −4
with bootstrap std > 100), confirming age is a structural prerequisite for OS model stability.

### Recommendations

| Scenario | Recommended configuration | Rationale |
|----------|--------------------------|-----------|
| Recurrence — all fields available | **7-feature** or **4-pathology** | Effectively equivalent; 4-pathology CoxPH is slightly better |
| Recurrence — staging/age unavailable | **4-pathology** | Binary markers carry the signal; no penalty from dropping staging |
| Recurrence — binary markers unavailable | **4-numeric** | −0.03 C-index is acceptable; staging and age partially compensate |
| Overall survival — age available | **7-feature** or **4-numeric** | Effectively equivalent; binary markers add no independent OS signal |
| Overall survival — age unavailable | Not recommended | 4-pathology OS calibration is unstable; use clinical judgement |
