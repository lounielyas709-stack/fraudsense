import joblib
import os

_dir = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(_dir, "model.pkl"))
scaler = joblib.load(os.path.join(_dir, "scaler.pkl"))
