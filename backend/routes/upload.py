from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from backend.db.models import DATABASE_URL
from backend.ml.loader import model, scaler, compute_shap, shap_top_factors
import pandas as pd
import io
import psycopg2
from urllib.parse import urlparse, parse_qs

router = APIRouter()

REQUIRED_COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]


def parse_db_url(url: str) -> dict:
    # Normalise le préfixe (Render donne postgres://)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    p = urlparse(url)
    params: dict = {
        "host": p.hostname,
        "port": p.port or 5432,
        "dbname": p.path.lstrip("/"),
        "user": p.username,
        "password": p.password,
    }
    # Récupère sslmode depuis la query string si présent
    qs = parse_qs(p.query)
    if "sslmode" in qs:
        params["sslmode"] = qs["sslmode"][0]
    elif p.hostname and p.hostname not in ("localhost", "127.0.0.1"):
        # Render et la plupart des hébergeurs cloud exigent SSL
        params["sslmode"] = "require"
    return params


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    threshold: float = Query(0.5, ge=0.1, le=0.9),
):
    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=422, detail="Impossible de lire le fichier CSV")

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise HTTPException(status_code=422, detail=f"Colonnes manquantes : {', '.join(missing)}")

    if df.empty:
        raise HTTPException(status_code=422, detail="Le fichier CSV est vide")

    # Scale Amount avant de passer en minuscules
    df["amount_scaled"] = scaler.transform(df[["Amount"]])
    df.columns = [c.lower() for c in df.columns]

    v_cols = [f"v{i}" for i in range(1, 29)]
    X = df[v_cols + ["amount_scaled"]].values
    probs = model.predict_proba(X)[:, 1]

    # Compute SHAP for all rows at once (vectorised — same cost as predicting)
    all_fraud_sv = compute_shap(X)  # shape (n_rows, n_features)

    db_params = parse_db_url(DATABASE_URL)
    try:
        conn = psycopg2.connect(**db_params)
    except Exception:
        raise HTTPException(status_code=500, detail="Impossible de se connecter à la base de données")

    cur = conn.cursor()
    try:
        # Insert transactions via COPY
        tx_buf = io.StringIO()
        for _, row in df.iterrows():
            vals = [str(float(row["amount"]))] + [str(float(row[c])) for c in v_cols]
            tx_buf.write("\t".join(vals) + "\n")
        tx_buf.seek(0)

        cur.execute(
            "CREATE TEMP TABLE tmp_tx (LIKE transactions INCLUDING DEFAULTS) ON COMMIT DROP"
        )
        cur.copy_from(tx_buf, "tmp_tx", columns=["amount"] + v_cols)
        cur.execute(
            "INSERT INTO transactions (amount,v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,v11,v12,"
            "v13,v14,v15,v16,v17,v18,v19,v20,v21,v22,v23,v24,v25,v26,v27,v28) "
            "SELECT amount,v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,v11,v12,"
            "v13,v14,v15,v16,v17,v18,v19,v20,v21,v22,v23,v24,v25,v26,v27,v28 "
            "FROM tmp_tx RETURNING id"
        )
        tx_ids = [row[0] for row in cur.fetchall()]

        # Insert predictions via COPY
        pred_buf = io.StringIO()
        for i, (tx_id, (_, row), prob) in enumerate(zip(tx_ids, df.iterrows(), probs)):
            fraud_prob = float(prob)
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
                factors = shap_top_factors(all_fraud_sv[i])
            else:
                factors = []

            risk_factors = ", ".join(factors)
            pred_buf.write(f"{tx_id}\t{round(fraud_prob, 4)}\t{label}\t{risk_level}\t{risk_factors}\n")

        pred_buf.seek(0)
        cur.copy_from(
            pred_buf, "predictions",
            columns=["transaction_id", "fraud_probability", "label", "risk_level", "risk_factors"],
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

    return {
        "message": f"{len(df)} transactions importées et analysées",
        "total": len(df),
    }
