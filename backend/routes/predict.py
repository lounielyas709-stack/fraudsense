from fastapi import APIRouter
import joblib
import pandas as pd
import numpy as np

router = APIRouter()

model = joblib.load("backend/ml/model.pkl")
scaler = joblib.load("backend/ml/scaler.pkl")

FEATURE_COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]

TOP_FEATURES = ["V17", "V14", "V12", "V10", "V16", "V3", "V7", "V11"]

def get_risk_factors(row: pd.Series, fraud_prob: float) -> list[str]:
    factors = []
    for feat in TOP_FEATURES:
        if abs(row[feat]) > 2:
            factors.append(f"{feat} anormal ({row[feat]:.2f})")
    if row["Amount"] > 2:
        factors.append("Montant élevé")
    if not factors:
        factors.append("Pattern inhabituel détecté")
    return factors[:3]

@router.post("/predict")
def predict(transaction: dict):
    df = pd.DataFrame([transaction])
    df["Amount"] = scaler.transform(df[["Amount"]])
    X = df[FEATURE_COLS]

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

    factors = get_risk_factors(df.iloc[0], fraud_prob) if label == "fraude" else []

    return {
        "fraud_probability": round(fraud_prob, 4),
        "label": label,
        "risk_level": risk_level,
        "risk_factors": factors
    }