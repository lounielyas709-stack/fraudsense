from fastapi import APIRouter, HTTPException
from backend.db.models import SessionLocal, Transaction, Prediction

router = APIRouter()


@router.get("/analytics")
def get_analytics():
    db = SessionLocal()
    try:
        total = db.query(Transaction).count()
        total_fraud = db.query(Prediction).filter(Prediction.label == "fraude").count()
        total_normal = db.query(Prediction).filter(Prediction.label == "normal").count()

        fraud_rate = round(total_fraud / total * 100, 2) if total > 0 else 0

        top_frauds = (
            db.query(Prediction)
            .filter(Prediction.label == "fraude")
            .order_by(Prediction.fraud_probability.desc())
            .limit(10)
            .all()
        )

        return {
            "total_transactions": total,
            "total_fraud": total_fraud,
            "total_normal": total_normal,
            "fraud_rate": fraud_rate,
            "top_frauds": [
                {
                    "transaction_id": p.transaction_id,
                    "fraud_probability": p.fraud_probability,
                    "risk_level": p.risk_level,
                    "risk_factors": p.risk_factors or "",
                }
                for p in top_frauds
            ],
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur base de données")
    finally:
        db.close()
