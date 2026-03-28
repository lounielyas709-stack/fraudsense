from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.predict import router as predict_router
from backend.routes.upload import router as upload_router
from backend.routes.analytics import router as analytics_router
from backend.routes.simulate import router as simulate_router

app = FastAPI(title="FraudSense API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(upload_router)
app.include_router(analytics_router)
app.include_router(simulate_router)

@app.get("/")
def root():
    return {"status": "FraudSense API is running"}