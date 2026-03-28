import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, recall_score
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
import joblib
import os

# --- Chargement
print("Chargement du dataset...")
df = pd.read_csv("data/creditcard.csv")

# --- Features / target
X = df.drop(columns=["Class", "Time"])
y = df["Class"]

# Normalisation Amount
scaler = StandardScaler()
X["Amount"] = scaler.fit_transform(X[["Amount"]])

# --- Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# --- SMOTE sur le train uniquement
print("Rééquilibrage SMOTE...")
sm = SMOTE(random_state=42)
X_train_res, y_train_res = sm.fit_resample(X_train, y_train)

# --- Random Forest
print("Entraînement Random Forest...")
rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
rf.fit(X_train_res, y_train_res)

# --- XGBoost
print("Entraînement XGBoost...")
ratio = len(y_train[y_train==0]) / len(y_train[y_train==1])
xgb = XGBClassifier(n_estimators=100, max_depth=6, scale_pos_weight=ratio,
                    random_state=42, eval_metric='aucpr', verbosity=0)
xgb.fit(X_train, y_train)

# --- Comparaison
print("\n=== COMPARAISON DES MODÈLES ===")
print(f"{'Modèle':<20} {'Recall':>8} {'AUC-ROC':>10}")
print("-" * 40)

results = {}
for name, model in [("Random Forest", rf), ("XGBoost", xgb)]:
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    recall = recall_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)
    results[name] = {"recall": recall, "auc": auc, "model": model}
    print(f"{name:<20} {recall:>8.4f} {auc:>10.4f}")

# --- Sélection du meilleur (basé sur recall)
winner_name = max(results, key=lambda x: results[x]["recall"])
winner = results[winner_name]["model"]
print(f"\nGagnant : {winner_name}")

# --- Sauvegarde
os.makedirs("backend/ml", exist_ok=True)
joblib.dump(winner, "backend/ml/model.pkl")
joblib.dump(scaler, "backend/ml/scaler.pkl")
print("Modèle sauvegardé → backend/ml/model.pkl")