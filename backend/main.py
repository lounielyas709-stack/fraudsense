import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.predict import router as predict_router
from backend.routes.upload import router as upload_router
from backend.routes.analytics import router as analytics_router
from backend.routes.simulate import router as simulate_router
from backend.db.models import init_db

logger = logging.getLogger("fraudsense")

app = FastAPI(title="FraudSense API", version="1.0")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    init_db()
    logger.info("Base de données initialisée avec succès")
except Exception as e:
    logger.error(f"Impossible d'initialiser la base de données : {e}")


app.include_router(predict_router)
app.include_router(upload_router)
app.include_router(analytics_router)
app.include_router(simulate_router)


@app.get("/")
def root():
    return {"status": "FraudSense API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
