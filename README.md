# TEAM ASPIRE - Clean Split Delivery

This delivery is organized into two clear folders:

- `frontend/`: HTML, CSS, JS, and PDF/image assets
- `backend/`: Node.js API, Mongo/file storage logic, env files, and complaint data

## Local run

1. Open the `backend` folder.
2. Check `backend/.env`.
3. If you want MongoDB, add `MONGODB_URI` in `backend/.env`.
4. Start the server from `backend`:

```powershell
cd backend
npm start
```

5. Open `http://localhost:3000`

## Important

- The backend now serves the separated `frontend` folder automatically.
- Admin login password is set in `backend/.env`.
- Complaint tracking page is available at `/track`.
- Root-level `Dockerfile` and `render.yaml` are included for cleaner deployment from this split structure.
