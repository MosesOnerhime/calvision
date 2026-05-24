# CalVision — Food Recognition & Calorie Estimation

## Quick Start (Docker — Recommended)

```bash
# 1. Clone the project
git clone <your-repo> && cd calvision

# 2. Copy env file and add your USDA key
cp backend/.env.example backend/.env

# 3. Start everything
docker-compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# Admin    → http://localhost:8000/admin
```

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # Edit with your values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000" > .env
npm start
```

## USDA API Key

Get a free key at: https://api.nal.usda.gov/
Add it to `backend/.env` as `USDA_API_KEY=your_key`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | True for development |
| `DATABASE_URL` | PostgreSQL connection string |
| `USDA_API_KEY` | USDA FoodData Central API key |

## AI Model Note

The Mask R-CNN model loads automatically via `torchvision` (pretrained on COCO).
If PyTorch is not available or the model fails to load, the system falls back to
realistic mock data so the frontend still works fully during development.

To use a food-specific fine-tuned model, replace the weights loading in
`backend/predict/model_loader.py` with your custom checkpoint.

## Project Structure

```
calvision/
├── backend/
│   ├── calvision_backend/    # Django settings, URLs, WSGI
│   ├── users/                # Auth, custom user model
│   ├── meals/                # Meal logs, food items
│   ├── predict/              # AI inference endpoint
│   └── data/                 # food_densities.json, nutrition_fallback.json
└── frontend/
    └── src/
        ├── api/              # Axios instance + interceptors
        ├── context/          # AuthContext (JWT state)
        ├── components/       # Navbar, ProtectedRoute
        └── pages/            # Login, Register, Dashboard, Upload, Results, History
```