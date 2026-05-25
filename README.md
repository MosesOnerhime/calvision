# CalVision - Food Recognition & Calorie Estimation

CalVision is a full-stack app for logging meals from photos. Users can upload a
meal image, receive detected food items with estimated calories/macros, and save
the result to their meal history.

## Quick Start (Docker)

```bash
# 1. Clone the project
git clone <your-repo> && cd calvision

# 2. Copy env file and add your USDA key if you have one
cp backend/.env.example backend/.env

# 3. Start everything
docker-compose up --build

# Frontend -> http://localhost:3000
# Backend  -> http://localhost:8000
# Admin    -> http://localhost:8000/admin
```

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # Edit with your values.
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev -- --port 3000
```

## USDA API Key

Get a free key at: https://api.nal.usda.gov/
Add it to `backend/.env` as `USDA_API_KEY=your_key`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | True for development |
| `DATABASE_URL` | Database URL. Defaults to local SQLite if omitted. |
| `USDA_API_KEY` | USDA FoodData Central API key |
| `ALLOWED_HOSTS` | Comma-separated Django host allowlist |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins allowed by the API |

Frontend variables:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API origin, for example `http://localhost:8000` |

## AI Model Note

The Mask R-CNN model loads automatically via `torchvision` with pretrained COCO
weights. The weights are downloaded by Torchvision on first use if they are not
already cached locally.

If PyTorch is not available or the model fails to load, the system falls back to
realistic mock data so the frontend still works fully during development.

To use a food-specific fine-tuned model, update
`backend/predict/model_loader.py` to load your custom checkpoint.

## Project Structure

```
calvision/
|-- backend/
|   |-- calvision_backend/    # Django settings, URLs, WSGI
|   |-- users/                # Auth, custom user model
|   |-- meals/                # Meal logs, food items
|   |-- predict/              # AI inference endpoint
|   `-- data/                 # food_densities.json, nutrition_fallback.json
`-- frontend/
    `-- src/
        |-- api/              # Axios instance + interceptors
        |-- context/          # AuthContext (JWT state)
        |-- components/       # Navbar, ProtectedRoute
        `-- pages/            # Login, Register, Dashboard, Upload, Results, History
```

## Tests

```bash
cd backend
python manage.py test
```
