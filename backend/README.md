# Voice-First Grievance Redressal System

This project turns the uploaded RR30 / TEAM ASPIRE deck into a working web application.

It follows the PPT flow:

- citizen voice input
- Sarvam AI speech-to-text
- keyword-based complaint classification
- user confirmation for edge cases
- location capture
- complaint storage
- admin dashboard for monitoring and status updates

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Speech recognition: Sarvam AI REST speech-to-text
- Storage: file storage by default, MongoDB optional

## Features

- Record audio in the browser or upload an audio clip
- Send audio to Sarvam AI using the `/speech-to-text` REST endpoint
- Use `saaras:v3` with `codemix` mode by default for Hindi + English style speech
- Suggest complaint categories using a multilingual keyword dataset
- Capture location through browser geolocation
- Generate tracking IDs for every complaint
- View complaint counts, category trends, and status updates in `/admin`

## Project structure

```text
public/
  index.html
  admin.html
  styles.css
  app.js
  admin.js
src/
  config/
  data/
  routes/
  services/
  storage/
  utils/
data/
  complaints.json
pdf_assets/
  slide_2_architecture.jpg
  slide_3_technical_approach.jpg
```

## Setup

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Sarvam API key in `.env`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Environment variables

```env
HOST=0.0.0.0
PORT=3000
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_API_URL=https://api.sarvam.ai
SARVAM_MODEL=saaras:v3
SARVAM_LANGUAGE_CODE=unknown
SARVAM_MODE=codemix
SARVAM_WITH_TIMESTAMPS=false

STORAGE_ENGINE=file
COMPLAINT_DATA_FILE=data/complaints.json
MONGODB_URI=
```

## Storage modes

### File storage

Default mode writes complaint records to `data/complaints.json`.

For cloud deployment, file storage is best only for demos. Use MongoDB if you want persistent complaint history across restarts.

### MongoDB

To switch to MongoDB:

1. set `STORAGE_ENGINE=mongo`
2. add a valid `MONGODB_URI`
3. run `npm install mongoose`

## Deployment

### Docker

Build and run:

```bash
docker build -t voice-grievance-app .
docker run --env-file .env -p 3000:3000 voice-grievance-app
```

### Render

- `render.yaml` is included for a quick web-service deploy
- set `SARVAM_API_KEY` in the Render dashboard
- for production persistence, prefer `STORAGE_ENGINE=mongo` with `MONGODB_URI`

### Production notes

- `HOST=0.0.0.0` is included for container-friendly startup
- `/api/health` is ready for health checks
- static frontend and API are served by the same Express server

## Verified Sarvam transcription

The integration was tested successfully against Sarvam's speech-to-text endpoint.

- English sample via app API:
  `This is a test of me recording my voice.`
- Real Hindi sample via app API in `transcribe` mode:
  `मैं ठीक हूँ, धन्यवाद और तुम?`
- Real Hindi sample via app API in `codemix` mode:
  `मैं ठीक हूँ धन्यवाद और तुम`

Hindi sample source used for verification:
- [OpenTTS Hindi sample](https://synesthesiam.github.io/opentts/samples/flite/hi/cmu_indic_hin_ab/sample_1.wav)

## API routes

- `GET /api/health`
- `GET /api/categories`
- `POST /api/transcribe`
- `POST /api/complaints`
- `GET /api/complaints/:trackingId`
- `GET /api/admin/summary`
- `GET /api/admin/complaints`
- `PATCH /api/admin/complaints/:trackingId/status`

## Notes

- The current Sarvam REST flow is ideal for short recordings. For longer audio, move to Sarvam batch or streaming APIs.
- The category engine is rule-based on purpose so it stays transparent and easy to demo in a hackathon setting.
- The PDF's architecture images are exposed in the UI so the app visually stays aligned with the original submission.
- The app automatically clears broken local proxy values like `127.0.0.1:9` so Sarvam API calls do not fail on misconfigured Windows environments.
