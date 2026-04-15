from fastapi import APIRouter, HTTPException, Query
from backend.ml.loader import model, scaler, compute_shap, shap_top_factors
import pandas as pd

router = APIRouter()

FEATURE_COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]


@router.post("/simulate")
def simulate(transaction: dict, threshold: float = Query(0.5, ge=0.1, le=0.9)):
    missing = [c for c in FEATURE_COLS if c not in transaction]
    if missing:
        raise HTTPException(status_code=422, detail=f"Champs manquants : {', '.join(missing)}")

    df = pd.DataFrame([transaction])
    df["Amount_scaled"] = scaler.transform(df[["Amount"]])

    X = df[[f"V{i}" for i in range(1, 29)] + ["Amount_scaled"]].values
    fraud_prob = float(model.predict_proba(X)[0][1])
    label = "fraude" if fraud_prob > threshold else "normal"

    if fraud_prob > 0.8:
        risk_level = "critique"
    elif fraud_prob > 0.5:
        risk_level = "élevé"
    elif fraud_prob > 0.3:
        risk_level = "moyen"
    else:
        risk_level = "faible"

    if label == "fraude":
        fraud_sv = compute_shap(X)
        factors = shap_top_factors(fraud_sv[0]) if fraud_sv is not None else ["Pattern inhabituel détecté"]
    else:
        factors = []

    return {
        "fraud_probability": round(fraud_prob, 4),
        "label": label,
        "risk_level": risk_level,
        "risk_factors": factors,
        "amount": transaction["Amount"],
    }
