# CalVision - Food Recognition & Calorie Estimation

CalVision is a full-stack app for logging meals from photos. Users can upload a
meal image, receive Nigerian-food segmentation/classification with estimated
calories/macros, and save the result to their meal history.

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

## Contabo Backend Deployment

The production backend runs on `moses.dev.approovia.net`; the React frontend is
hosted separately at `https://calvision-two.vercel.app`. The backend-only stack
in `docker-compose.backend.yml` contains PostgreSQL, Django/Gunicorn with YOLO,
and Caddy. Caddy obtains and renews HTTPS certificates automatically and serves
Django's static and uploaded media files.

Use a Linux VPS with at least 4 GB RAM. The current deployment target has 8 GB,
which is suitable for the project's CPU-based YOLO inference workload.

### Server Setup

```bash
ssh root@moses.dev.approovia.net
apt update
apt install -y docker.io docker-compose-v2 ufw
systemctl enable --now docker
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Upload or clone the repository into `/opt/calvision`, then create the untracked
production environment file:

```bash
cd /opt/calvision
cp backend/.env.contabo.example backend/.env
nano backend/.env
```

Replace `SECRET_KEY`, `POSTGRES_PASSWORD`, and the password inside
`DATABASE_URL`. Add a real `USDA_API_KEY` when one is available. The example
already restricts browser API access to the deployed Vercel frontend.

Start and verify the backend:

```bash
docker compose -f docker-compose.backend.yml up --build -d
docker compose -f docker-compose.backend.yml ps
docker compose -f docker-compose.backend.yml logs -f backend
curl https://moses.dev.approovia.net/api/health/
```

In Vercel, set `VITE_API_URL=https://moses.dev.approovia.net` for the Production
environment and redeploy the frontend. Vite embeds this value at build time, so
changing it requires a new Vercel deployment.

### Useful Production Commands

```bash
docker compose -f docker-compose.backend.yml ps
docker compose -f docker-compose.backend.yml logs -f
docker compose -f docker-compose.backend.yml restart backend
docker compose -f docker-compose.backend.yml exec backend python manage.py createsuperuser
docker compose -f docker-compose.backend.yml pull
docker compose -f docker-compose.backend.yml up --build -d
```

Do not run `docker compose down -v` in production because `-v` deletes the
PostgreSQL, media, and TLS certificate volumes.

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

## AI Pipeline

CalVision uses a YOLO instance segmentation model first. It detects visible
food regions, returns bounding boxes and segmentation masks, and the backend
draws the colored AI output overlay shown on the results page.

The trained YOLO model lives here:

```
backend/predict/model_files/yolo_food_seg.pt
```

The current segmentation classes are:

```
jollof_rice
fried_plantain
chicken
egusi_soup
eba
pounded_yam
```

If YOLO is unavailable or detects no food regions, CalVision falls back to the
Teachable Machine TensorFlow Lite classifier. The classifier files live here:

```
backend/predict/model_files/model.tflite
backend/predict/model_files/labels.txt
```

The TFLite classifier identifies the main dish in the uploaded photo. It is not
an object detector, so it is used only as a fallback path.

## CVAT Annotation Workflow

The YOLO segmentation dataset was prepared with CVAT:

1. A CVAT project was created for Nigerian/African food segmentation.
2. Labels were added for `jollof_rice`, `fried_plantain`, `chicken`,
   `egusi_soup`, `eba`, and `pounded_yam`.
3. Food images were uploaded into a CVAT task.
4. Polygon annotations were drawn around each visible food item in every image.
5. The completed task was exported as **YOLO Ultralytics Segmentation**.
6. The exported files were placed in:

```
backend/african_food_annotation/
```

The dataset is arranged as:

```
backend/african_food_annotation/
|-- data.yaml
|-- train.txt
|-- val.txt
|-- data/
|   |-- images/train/
|   `-- labels/train/
`-- labels/train/
```

The project uses an 80/20 train-validation split. The latest split contains 154
training images and 38 validation images.

## YOLO Training And Evaluation

YOLO dependencies are kept separate from the lightweight backend requirements
because PyTorch/Ultralytics are large:

```bash
cd backend
pip install -r requirements-yolo.txt
```

Train the segmentation model:

```bash
python predict/train_yolo_segmenter.py train --model predict/model_files/yolo_food_seg.pt --epochs 100 --imgsz 640 --batch 2 --workers 0 --device 0
```

The `--workers 0` option is used on Windows to avoid Torch multiprocessing
memory issues. The script copies the best trained model to:

```
backend/predict/model_files/yolo_food_seg.pt
```

Evaluate the trained model:

```bash
python predict/evaluate_yolo_segmenter.py --model predict/model_files/yolo_food_seg.pt --data african_food_annotation/data.yaml --imgsz 640 --workers 0 --device 0
```

Evaluation outputs are written to:

```
backend/predict/yolo_evaluation_reports/
```

### Latest YOLO Evaluation

The model was evaluated on 38 validation images containing 63 annotated food
instances. Since segmentation models do not use ordinary classification
accuracy, **mask mAP@0.5** is used as the main accuracy-style metric.

| Metric | Result |
|--------|--------|
| Mask mAP@0.5 | 62.23% |
| Mask mAP@0.5:0.95 | 48.98% |
| Precision | 50.64% |
| Recall | 60.38% |
| F1-score | 55.08% |
| Box mAP@0.5 | 61.30% |

Per-class mask mAP@0.5:

| Class | Support | Precision | Recall | F1-score | Mask mAP@0.5 |
|-------|---------|-----------|--------|----------|--------------|
| Jollof Rice | 20 | 74.02% | 100.00% | 85.07% | 99.26% |
| Fried Plantain | 6 | 46.50% | 50.00% | 48.19% | 48.83% |
| Chicken | 9 | 25.39% | 55.56% | 34.85% | 26.72% |
| Egusi Soup | 19 | 80.92% | 100.00% | 89.45% | 99.50% |
| Eba | 6 | 77.02% | 56.73% | 65.33% | 87.85% |
| Pounded Yam | 3 | 0.00% | 0.00% | 0.00% | 11.20% |

The strongest classes are `egusi_soup`, `jollof_rice`, and `eba`. `pounded_yam`
needs more annotated examples because the validation set currently contains only
three pounded-yam instances.

## Project Structure

```
calvision/
|-- backend/
|   |-- calvision_backend/    # Django settings, URLs, WSGI
|   |-- users/                # Auth, custom user model
|   |-- meals/                # Meal logs, food items
|   |-- predict/              # AI inference endpoint, YOLO segmenter, TFLite fallback
|   `-- data/                 # nutrition_fallback.json
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
