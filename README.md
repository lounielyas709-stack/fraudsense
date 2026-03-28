# FraudSense — Fraud Intelligence Platform

> Plateforme SaaS de détection de fraude pour le secteur assurance / mutuelle / fintech.

![Stack](https://img.shields.io/badge/Python-FastAPI-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Stack](https://img.shields.io/badge/PostgreSQL-18-336791?style=flat-square&logo=postgresql)
![Stack](https://img.shields.io/badge/Scikit--learn-ML-F7931E?style=flat-square&logo=scikit-learn)

---

## Présentation

FraudSense est une plateforme full-stack de détection de fraude construite autour d'un modèle de machine learning entraîné sur 284 807 transactions bancaires réelles (dataset Credit Card Fraud Detection — Kaggle / ULB).

Le projet couvre l'ensemble du pipeline data : ingestion de données, traitement, scoring ML, API REST et dashboard interactif — conçu pour être utilisable par une équipe métier sans compétences techniques.

**Problème adressé :** les entreprises du secteur assurance et mutuelle traitent des volumes importants de transactions sans outil simple pour détecter les comportements frauduleux en temps réel.

**Solution :** une interface d'upload, d'analyse automatique et de visualisation des résultats, avec explication des décisions et simulation interactive.

---

## Fonctionnalités

### Core
- Upload de fichier CSV avec analyse automatique de chaque transaction
- Score de probabilité de fraude entre 0 et 1 pour chaque ligne
- Classification automatique : Normal / Suspect / Fraude
- Explication des décisions : facteurs de risque affichés par transaction

### Dashboard
- KPIs globaux : nombre de transactions, fraudes détectées, taux de fraude
- Graphique de distribution (bar chart + donut chart)
- Table des top transactions suspectes, triée par score décroissant
- Modal de détail au clic sur chaque transaction

### Simulation interactive
- Modification des paramètres d'une transaction en live (sliders)
- Recalcul du score en temps réel
- Presets : transaction normale / transaction suspecte
- Affichage des facteurs déclencheurs

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | Next.js 14 + React + TypeScript | Dashboard, upload, simulation |
| Backend | Python 3.12 + FastAPI | API REST, orchestration |
| ML | Scikit-learn + XGBoost + Pandas | Modèle de scoring, features |
| Base de données | PostgreSQL 18 | Stockage transactions et prédictions |
| Déploiement | Vercel + Render | Front sur Vercel, back sur Render |

---

## Architecture

```
fraudsense/
├── backend/
│   ├── ml/
│   │   ├── train.py          # Entraînement RF vs XGBoost + export
│   │   ├── model.pkl         # Modèle sélectionné (Random Forest)
│   │   └── scaler.pkl        # StandardScaler pour Amount
│   ├── routes/
│   │   ├── upload.py         # POST /upload — ingestion CSV
│   │   ├── predict.py        # POST /predict — score unitaire
│   │   ├── analytics.py      # GET /analytics — KPIs dashboard
│   │   └── simulate.py       # POST /simulate — recalcul live
│   ├── db/
│   │   └── models.py         # Tables SQLAlchemy (transactions, predictions)
│   └── main.py               # App FastAPI + CORS
├── frontend/
│   └── app/
│       ├── page.tsx          # Dashboard principal
│       ├── upload/           # Page import CSV
│       └── simulate/         # Page simulation interactive
├── notebooks/
│   └── 01_exploration.ipynb  # EDA : distribution, corrélations, insights
└── data/
    └── demo_sample.csv       # Sample 5000 lignes (100 fraudes) pour démo
```

---

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/upload` | Import CSV, scoring batch, stockage PostgreSQL |
| `POST` | `/predict` | Score fraude pour une transaction unique |
| `GET` | `/analytics` | KPIs globaux + top 10 transactions suspectes |
| `POST` | `/simulate` | Recalcul du score avec paramètres modifiés |

Documentation interactive disponible sur `/docs` (Swagger UI).

---

## Modèle ML

### Dataset
- **Source :** Credit Card Fraud Detection — Kaggle (ULB / Worldline)
- **Volume :** 284 807 transactions bancaires européennes anonymisées (2013)
- **Fraudes :** 492 cas — 0,17% du dataset (déséquilibre majeur)
- **Features :** Time, V1–V28 (PCA anonymisée), Amount, Class

### Approche
Le déséquilibre des classes (0,17% de fraudes) est le principal défi. Un modèle naïf qui prédit "Normal" pour tout obtient 99,83% d'accuracy sans détecter une seule fraude — c'est pourquoi l'accuracy n'est pas utilisée comme métrique.

**Pipeline d'entraînement :**
1. Normalisation de la colonne Amount (StandardScaler)
2. Suppression de Time (peu informatif seul)
3. Rééquilibrage par SMOTE sur le train set uniquement
4. Comparaison Random Forest vs XGBoost
5. Sélection du meilleur modèle selon le recall

### Résultats

| Modèle | Recall | AUC-ROC |
|--------|--------|---------|
| Random Forest | **0.8673** | **0.9793** |
| XGBoost | 0.8469 | 0.9691 |

**Gagnant : Random Forest** — meilleur recall sur ce dataset.

Le recall est la métrique principale : on préfère quelques faux positifs plutôt que de manquer une vraie fraude.

### Explication des features V1–V28
Ces colonnes sont le résultat d'une PCA appliquée par Worldline pour anonymiser les données originales avant publication. Les features V17, V14, V12, V10 et V16 présentent la corrélation la plus forte avec la fraude (corrélation > 0,15). Quand leurs valeurs dépassent ±2 écarts-types, le système signale un comportement anormal.

---

## Installation locale

### Prérequis
- Python 3.12+
- Node.js 20+
- PostgreSQL 18

### Backend

```bash
# Cloner le repo
git clone https://github.com/ton-username/fraudsense.git
cd fraudsense

# Environnement virtuel
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Dépendances
pip install -r backend/requirements.txt

# Base de données
# Créer une DB PostgreSQL nommée "fraudsense"
# Modifier DATABASE_URL dans backend/db/models.py

# Créer les tables
python -c "from backend.db.models import init_db; init_db()"

# Entraîner le modèle (nécessite data/creditcard.csv)
python backend/ml/train.py

# Lancer l'API
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:3000`.
L'API est accessible sur `http://localhost:8000`.
La documentation Swagger est sur `http://localhost:8000/docs`.

### Dataset

Télécharger `creditcard.csv` depuis [Kaggle](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) et le placer dans `data/creditcard.csv`.

Un fichier `data/demo_sample.csv` (5 000 transactions dont 100 fraudes) est inclus pour tester rapidement sans entraîner le modèle.

---

## Utilisation

1. Importer un fichier CSV via la page `/upload`
2. Le backend analyse chaque transaction et calcule un score de fraude
3. Le dashboard affiche les KPIs et les transactions les plus suspectes
4. Cliquer sur une transaction pour voir le détail et les facteurs de risque
5. Utiliser `/simulate` pour tester l'impact de modifications sur le score

---

## Contexte portfolio

Ce projet a été construit dans le cadre d'un portfolio Data & AI pour démontrer la capacité à concevoir et implémenter un système data complet — de la pipeline ML jusqu'à l'interface utilisateur.

**Ce qui distingue ce projet d'un script ML classique :**
- Architecture backend structurée avec API REST documentée
- Explainable AI — chaque décision est accompagnée de facteurs lisibles
- Simulation interactive — feature absente des outils similaires
- Positionnement sectoriel — pensé pour assurance / mutuelle (acteurs type Klesia)
- Dashboard décisionnel — aide à prioriser les dossiers, pas juste à afficher des données

---

## Licence

MIT — Projet personnel à des fins de démonstration portfolio.

---

*FraudSense — Elyas, 2026*
