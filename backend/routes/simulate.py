from fastapi import APIRouter, HTTPException
from backend.ml.loader import model, scaler
import pandas as pd

router = APIRouter()

FEATURE_COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]
TOP_FEATURES = ["V17", "V14", "V12", "V10", "V16", "V3", "V7", "V11"]


def get_risk_factors(row: dict) -> list[str]:
    factors = []
    for feat in TOP_FEATURES:
        val = row[feat]
        if abs(val) > 2:
            factors.append(f"{feat} anormal ({val:.2f})")
    if row["Amount"] > 2:
        factors.append("Montant élevé")
    if not factors:
        factors.append("Pattern inhabituel détecté")
    return factors[:3]


@router.post("/simulate")
def simulate(transaction: dict):
    missing = [c for c in FEATURE_COLS if c not in transaction]
    if missing:
        raise HTTPException(status_code=422, detail=f"Champs manquants : {', '.join(missing)}")

    df = pd.DataFrame([transaction])
    df["Amount_scaled"] = scaler.transform(df[["Amount"]])

    X = df[[f"V{i}" for i in range(1, 29)] + ["Amount_scaled"]].values
    fraud_prob = float(model.predict_proba(X)[0][1])
    label = "fraude" if fraud_prob > 0.5 else "normal"

    if fraud_prob > 0.8:
        risk_level = "critique"
    elif fraud_prob > 0.5:
        risk_level = "élevé"
    elif fraud_prob > 0.3:
        risk_level = "moyen"
    else:
        risk_level = "faible"

    # Pass original (unscaled) values for risk factor analysis, but use scaled Amount
    row = {f"V{i}": transaction[f"V{i}"] for i in range(1, 29)}
    row["Amount"] = float(df["Amount_scaled"].iloc[0])
    factors = get_risk_factors(row) if label == "fraude" else []

    return {
        "fraud_probability": round(fraud_prob, 4),
        "label": label,
        "risk_level": risk_level,
        "risk_factors": factors,
        "amount": transaction["Amount"],
    }
