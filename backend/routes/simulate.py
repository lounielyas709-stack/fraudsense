from fastapi import APIRouter
import joblib
import pandas as pd
import numpy as np

router = APIRouter()

model = joblib.load("backend/ml/model.pkl")
scaler = joblib.load("backend/ml/scaler.pkl")

TOP_FEATURES = ["V17", "V14", "V12", "V10", "V16", "V3", "V7", "V11"]
FEATURE_COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]

def get_risk_factors(row, fraud_prob):
    factors = []
    for feat in TOP_FEATURES:
        if abs(row[feat]) > 2:
            factors.append(f"{feat} anormal ({row[feat]:.2f})")
    if row["Amount"] > 2:
        factors.append("Montant élevé")
    if not factors:
        factors.append("Pattern inhabituel détecté")
    return factors[:3]

@router.post("/simulate")
def simulate(transaction: dict):
    df = pd.DataFrame([transaction])
    df["Amount_scaled"] = scaler.transform(df[["Amount"]])

    X = df[[f"V{i}" for i in range(1, 29)] + ["Amount_scaled"]].values
    fraud_prob = float(model.predict_proba(X)[0][1])
    label = "fraude" if fraud_prob > 0.5 else "normal"

    if fraud_prob > 0.8: risk_level = "critique"
    elif fraud_prob > 0.5: risk_level = "élevé"
    elif fraud_prob > 0.3: risk_level = "moyen"
    else: risk_level = "faible"

    row = {f"V{i}": transaction[f"V{i}"] for i in range(1, 29)}
    row["Amount"] = df["Amount_scaled"].iloc[0]
    factors = get_risk_factors(row, fraud_prob) if label == "fraude" else []

    return {
        "fraud_probability": round(fraud_prob, 4),
        "label": label,
        "risk_level": risk_level,
        "risk_factors": factors,
        "amount": transaction["Amount"]
    }