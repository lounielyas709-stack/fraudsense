"""
Test de l'API FraudSense — sans base de données.
Utilise les endpoints /predict et /simulate qui ne touchent pas la DB.

Usage :
    # Local
    python test_api.py

    # Production
    python test_api.py https://fraudsense-api.onrender.com
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

# Transaction normale (faible risque)
TX_NORMAL = {
    "V1": -1.36, "V2": -0.07, "V3": 2.53, "V4": 1.38, "V5": -0.34,
    "V6": 0.46,  "V7": 0.24,  "V8": 0.10, "V9": 0.36, "V10": 0.09,
    "V11": -0.55, "V12": -0.62, "V13": -0.99, "V14": -0.31, "V15": 1.47,
    "V16": -0.47, "V17": 0.21, "V18": 0.03, "V19": 0.40, "V20": 0.25,
    "V21": -0.02, "V22": 0.28, "V23": -0.11, "V24": 0.07, "V25": 0.13,
    "V26": -0.19, "V27": 0.13, "V28": -0.02, "Amount": 149.62,
}

# Transaction frauduleuse (risque élevé)
TX_FRAUD = {
    "V1": -2.31, "V2": 1.95,  "V3": -1.61, "V4": 3.99,  "V5": -0.52,
    "V6": -1.43, "V7": -2.77, "V8": -2.77, "V9": -0.38, "V10": -1.19,
    "V11": 1.94, "V12": -1.17, "V13": 0.65, "V14": -6.05, "V15": -0.27,
    "V16": -2.89, "V17": -8.23, "V18": -0.17, "V19": 0.35, "V20": -0.02,
    "V21": -0.01, "V22": -0.06, "V23": -0.06, "V24": -0.17, "V25": 0.05,
    "V26": -0.18, "V27": 0.07, "V28": -0.05, "Amount": 239.93,
}


def post(path: str, payload: dict) -> dict:
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def get(path: str) -> dict:
    url = f"{BASE_URL}{path}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.loads(resp.read())


def check(label: str, result: dict, expected_label: str):
    ok = result.get("label") == expected_label
    prob = result.get("fraud_probability", 0)
    status = "✓" if ok else "✗"
    print(f"  {status} {label:30s} → {result.get('label'):8s} | score={prob:.2%} | risque={result.get('risk_level')}")
    if not ok:
        print(f"    ATTENDU: {expected_label}, OBTENU: {result.get('label')}")


print(f"\n{'='*55}")
print(f"  FraudSense API — test hors DB")
print(f"  URL: {BASE_URL}")
print(f"{'='*55}\n")

# 1. Health check
print("1. Health check")
try:
    r = get("/health")
    print(f"  ✓ /health → {r}\n")
except Exception as e:
    print(f"  ✗ /health ERREUR : {e}\n")
    sys.exit(1)

# 2. /predict
print("2. /predict (sans DB)")
try:
    check("Transaction normale",    post("/predict", TX_NORMAL), "normal")
    check("Transaction frauduleuse", post("/predict", TX_FRAUD),  "fraude")
except Exception as e:
    print(f"  ✗ ERREUR : {e}")
print()

# 3. /simulate
print("3. /simulate (sans DB)")
try:
    check("Transaction normale",    post("/simulate", TX_NORMAL), "normal")
    check("Transaction frauduleuse", post("/simulate", TX_FRAUD),  "fraude")
except Exception as e:
    print(f"  ✗ ERREUR : {e}")
print()

# 4. /predict — champs manquants
print("4. /predict — validation des champs manquants")
try:
    post("/predict", {"V1": 1.0, "Amount": 100.0})
    print("  ✗ Aurait dû retourner 422")
except urllib.error.HTTPError as e:
    if e.code == 422:
        print("  ✓ 422 correctement retourné pour payload incomplet")
    else:
        print(f"  ✗ Code inattendu : {e.code}")
print()

print("Tests terminés.\n")
