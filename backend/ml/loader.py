import os
import joblib
import numpy as np
import shap

_dir = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(_dir, "model.pkl"))
scaler = joblib.load(os.path.join(_dir, "scaler.pkl"))
explainer = shap.TreeExplainer(model)

# Feature order must match the training matrix: V1..V28 + Amount (scaled)
SHAP_FEATURE_NAMES = [f"V{i}" for i in range(1, 29)] + ["Amount"]


def compute_shap(X) -> np.ndarray:
    """Return SHAP values for the fraud class, shape (n_rows, n_features)."""
    sv = explainer.shap_values(X, check_additivity=False)
    # RandomForest returns a list [class_0, class_1]; XGBoost returns a single array
    return sv[1] if isinstance(sv, list) else sv


def shap_top_factors(fraud_sv_row: np.ndarray, n: int = 3) -> list[str]:
    """
    Given a 1-D SHAP vector for one row (fraud class),
    return the top-n features as human-readable strings.
    Example: ["V14 (+0.42)", "V17 (+0.38)", "V10 (-0.12)"]
    """
    top_idx = np.argsort(np.abs(fraud_sv_row))[::-1][:n]
    factors = []
    for j in top_idx:
        val = fraud_sv_row[j]
        sign = "+" if val >= 0 else ""
        factors.append(f"{SHAP_FEATURE_NAMES[j]} ({sign}{val:.2f})")
    return factors
