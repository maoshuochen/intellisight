# Intellisight

This repository combines the original Intellisight frontend and backend projects into one workspace.

## Structure

- `frontend/` - Vue 3 + Vite frontend from `maoshuochen/intellisight-frontend`
- `backend/` - Flask backend from `maoshuochen/intellisight-backend`

## Frontend

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

## Backend

```sh
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cd backend
.venv/bin/python app.py
```

The backend starts on port `5000` by default.

## Notes

- Both source repositories were imported with `git subtree`, under `frontend/` and `backend/`.
- Replace any local API keys or environment values before running the app in a shared environment.
