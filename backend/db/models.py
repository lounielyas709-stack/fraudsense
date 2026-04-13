from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

def _utcnow():
    return datetime.now(timezone.utc)
import os
from dotenv import load_dotenv

load_dotenv()

_raw_url = os.getenv("DATABASE_URL")
if not _raw_url:
    raise RuntimeError("DATABASE_URL n'est pas défini. Ajoutez-le dans les variables d'environnement.")

# Render fournit des URLs postgres:// ; SQLAlchemy exige postgresql://
DATABASE_URL = _raw_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 10})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    v1 = Column(Float); v2 = Column(Float); v3 = Column(Float)
    v4 = Column(Float); v5 = Column(Float); v6 = Column(Float)
    v7 = Column(Float); v8 = Column(Float); v9 = Column(Float)
    v10 = Column(Float); v11 = Column(Float); v12 = Column(Float)
    v13 = Column(Float); v14 = Column(Float); v15 = Column(Float)
    v16 = Column(Float); v17 = Column(Float); v18 = Column(Float)
    v19 = Column(Float); v20 = Column(Float); v21 = Column(Float)
    v22 = Column(Float); v23 = Column(Float); v24 = Column(Float)
    v25 = Column(Float); v26 = Column(Float); v27 = Column(Float)
    v28 = Column(Float)
    imported_at = Column(DateTime, default=_utcnow)


class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer)
    fraud_probability = Column(Float)
    label = Column(String)
    risk_level = Column(String)
    risk_factors = Column(String)
    created_at = Column(DateTime, default=_utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
