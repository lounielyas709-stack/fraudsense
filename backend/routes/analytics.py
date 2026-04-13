from fastapi import APIRouter, HTTPException, Query
from backend.db.models import SessionLocal, Transaction, Prediction

router = APIRouter()


@router.get("/frauds")
def get_all_frauds(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
):
    db = SessionLocal()
    try:
        offset = (page - 1) * limit
        total = db.query(Prediction).filter(Prediction.label == "fraude").count()
        frauds = (
            db.query(Prediction)
            .filter(Prediction.label == "fraude")
            .order_by(Prediction.fraud_probability.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": max(1, -(-total // limit)),  # ceil division
            "frauds": [
                {
                    "id": p.id,
                    "transaction_id": p.transaction_id,
                    "fraud_probability": p.fraud_probability,
                    "risk_level": p.risk_level,
                    "risk_factors": p.risk_factors or "",
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                for p in frauds
            ],
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur base de données")
    finally:
        db.close()


@router.delete("/data")
def clear_all_data():
    db = SessionLocal()
    try:
        deleted_predictions = db.query(Prediction).delete()
        deleted_transactions = db.query(Transaction).delete()
        db.commit()
        return {
            "message": "Base de données vidée avec succès",
            "deleted_transactions": deleted_transactions,
            "deleted_predictions": deleted_predictions,
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    finally:
        db.close()


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
