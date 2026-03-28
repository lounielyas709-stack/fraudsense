from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.db.models import DATABASE_URL
import pandas as pd
import joblib
import numpy as np
import io
import psycopg2
from urllib.parse import urlparse

router = APIRouter()

model = joblib.load("backend/ml/model.pkl")
scaler = joblib.load("backend/ml/scaler.pkl")

TOP_FEATURES = ["V17", "V14", "V12", "V10", "V16", "V3", "V7", "V11"]

def parse_db_url(url):
    p = urlparse(url)
    return {
        "host": p.hostname,
        "port": p.port or 5432,
        "dbname": p.path.lstrip("/"),
        "user": p.username,
        "password": p.password,
    }

def get_risk_factors(row, fraud_prob):
    factors = []
    for feat in TOP_FEATURES:
        col = feat.lower()
        val = row[col]
        if abs(val) > 2:
            factors.append(f"{feat} anormal ({val:.2f})")
    if row["amount_scaled"] > 2:
        factors.append("Montant élevé")
    if not factors:
        factors.append("Pattern inhabituel détecté")
    return factors[:3]

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    # Scaling + lowercase
    df["amount_scaled"] = scaler.transform(df[["Amount"]])
    df.columns = [c.lower() for c in df.columns]

    # ML en une seule fois
    X = df[[f"v{i}" for i in range(1, 29)] + ["amount_scaled"]].values
    probs = model.predict_proba(X)[:, 1]

    # Connexion psycopg2 directe
    db_params = parse_db_url(DATABASE_URL)
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        # --- COPY transactions ---
        tx_buf = io.StringIO()
        v_cols = [f"v{i}" for i in range(1, 29)]
        for _, row in df.iterrows():
            vals = [str(float(row["amount"]))] + [str(float(row[c])) for c in v_cols]
            tx_buf.write("\t".join(vals) + "\n")
        tx_buf.seek(0)

        cur.execute("CREATE TEMP TABLE tmp_tx (LIKE transactions INCLUDING ALL) ON COMMIT DROP")
        cur.copy_from(tx_buf, "tmp_tx", columns=["amount"] + v_cols)
        cur.execute("INSERT INTO transactions (amount, v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,v11,v12,v13,v14,v15,v16,v17,v18,v19,v20,v21,v22,v23,v24,v25,v26,v27,v28) SELECT amount,v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,v11,v12,v13,v14,v15,v16,v17,v18,v19,v20,v21,v22,v23,v24,v25,v26,v27,v28 FROM tmp_tx RETURNING id")
        tx_ids = [row[0] for row in cur.fetchall()]

        # --- COPY predictions ---
        pred_buf = io.StringIO()
        for tx_id, (_, row), prob in zip(tx_ids, df.iterrows(), probs):
            fraud_prob = float(prob)
            label = "fraude" if fraud_prob > 0.5 else "normal"
            if fraud_prob > 0.8: risk_level = "critique"
            elif fraud_prob > 0.5: risk_level = "élevé"
            elif fraud_prob > 0.3: risk_level = "moyen"
            else: risk_level = "faible"
            factors = get_risk_factors(row, fraud_prob) if label == "fraude" else []
            risk_factors = ", ".join(factors)
            pred_buf.write(f"{tx_id}\t{round(fraud_prob, 4)}\t{label}\t{risk_level}\t{risk_factors}\n")

        pred_buf.seek(0)
        cur.copy_from(pred_buf, "predictions",
                      columns=["transaction_id", "fraud_probability", "label", "risk_level", "risk_factors"])

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

    return {
        "message": f"{len(df)} transactions importées et analysées",
        "total": len(df)
    }