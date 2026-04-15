from fastapi import APIRouter, HTTPException, Query
from backend.ml.loader import model, scaler
import pandas as pd

router = APIRouter()

FEATURE_COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]

FRAUD_DIRECTIONS: dict[str, str] = {
    "V17": "négatif", "V14": "négatif", "V12": "négatif",
    "V10": "négatif", "V16": "négatif", "V3": "positif",
    "V7": "négatif", "V11": "positif",
}


def get_risk_factors(transaction: dict) -> list[str]:
    factors = []
    for feat, direction in FRAUD_DIRECTIONS.items():
        val = transaction.get(feat, 0)
        if direction == "négatif" and val < -2:
            factors.append(f"{feat} anormal ({val:.2f})")
        elif direction == "positif" and val > 2:
            factors.append(f"{feat} anormal ({val:.2f})")
    if not factors:
        factors.append("Pattern inhabituel détecté")
    return factors[:3]


@router.post("/predict")
def predict(transaction: dict, threshold: float = Query(0.5, ge=0.1, le=0.9)):
    missing = [c for c in FEATURE_COLS if c not in transaction]
    if missing:
        raise HTTPException(status_code=422, detail=f"Champs manquants : {', '.join(missing)}")

    df = pd.DataFrame([transaction])
    df["Amount"] = scaler.transform(df[["Amount"]])
    X = df[FEATURE_COLS]

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

    factors = get_risk_factors(transaction) if label == "fraude" else []

    return {
        "fraud_probability": round(fraud_prob, 4),
        "label": label,
        "risk_level": risk_level,
        "risk_factors": factors,
    }
