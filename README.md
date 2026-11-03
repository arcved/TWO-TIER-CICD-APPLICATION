# Clearpath

Clearpath is a small internal work-request tracker built for practicing application delivery and DevOps workflows. It uses React 18 and Vite, Python 3.9 with Flask, and MongoDB.

## Features

- Create, view, update, and delete work requests.
- Search requests and filter by status or priority.
- Dashboard counts for all, open, in-progress, and completed requests.
- Light and dark themes, initially following the operating-system preference and then saved in local storage.
- Health endpoint at `/api/health`.
- Four sample requests are inserted when the MongoDB collection is empty.

Each request has a title, description, status (`open`, `in_progress`, `blocked`, `done`), priority (`low`, `medium`, `high`, `critical`), category (`incident`, `change`, `task`, `access`), assignee, reporter, and creation/update timestamps.

## Local development

Use Node.js `20.19+` or `22.12+` with npm for the Vite frontend. MongoDB must be running and reachable at `mongodb://localhost:27017` before starting the backend. Either start your local MongoDB service or, from the repository root, build and run the database container:

```bash
docker build -t clearpath-database-image:latest ./database
docker run -d --name database -p 27017:27017 clearpath-database-image:latest
```

If a container named `database` already exists, start it with `docker start database` instead. Copy `backend/.env.example` to `backend/.env` if you need to change the backend defaults. Copy `frontend/.env.example` to `frontend/.env.local` to override the API URL; the default is `http://localhost:5000/api`.

### Git Bash on Windows

Start the backend in one Git Bash terminal:

```bash
cd /e/GITHUB/TWO-TIER/TWO-TIER-CICD-APPLICATION/backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python -m app.main
```

Start the frontend in another Git Bash terminal:

```bash
cd /e/GITHUB/TWO-TIER/TWO-TIER-CICD-APPLICATION/frontend
npm install
npm run dev
```

### PowerShell

For PowerShell, activate the backend virtual environment with `.\.venv\Scripts\Activate.ps1` instead of the Git Bash `source` command. Run the same remaining backend and frontend commands above from their respective directories.

Open [http://localhost:3000](http://localhost:3000). The Flask API listens on port `5000`; its host, port, MongoDB URI/database, and allowed CORS origins are configurable through `HOST`, `PORT`, `MONGODB_URI`, `MONGODB_DB`, and `CORS_ORIGINS`.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API and MongoDB health |
| GET | `/api/requests` | List requests; optional `search`, `status`, and `priority` query parameters |
| GET | `/api/requests/stats` | Total and status/priority counts |
| GET | `/api/requests/{id}` | Get one request |
| POST | `/api/requests` | Create a request |
| PUT | `/api/requests/{id}` | Update a request |
| DELETE | `/api/requests/{id}` | Delete a request |

## Docker images

The Dockerfiles are in `frontend/`, `backend/`, and `database/`. Run these commands from the repository root in PowerShell to build and start the containers. They were not run as part of this project setup.

```powershell
docker network create clearpath-net
docker volume create clearpath-mongo-data

docker build -t clearpath-frontend-image:latest .\frontend
docker build -t clearpath-backend-image:latest .\backend
docker build -t clearpath-database-image:latest .\database

docker run -d --name database --network clearpath-net -p 27017:27017 `
  --volume clearpath-mongo-data:/data/db clearpath-database-image:latest
$databaseReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  docker exec database mongosh --quiet --eval "db.adminCommand('ping').ok" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $databaseReady = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $databaseReady) { throw "Database did not become ready" }

docker run -d --name backend --network clearpath-net -p 5000:5000 `
  -e MONGODB_URI=mongodb://database:27017 -e MONGODB_DB=clearpath `
  -e CORS_ORIGINS=http://localhost:3000 clearpath-backend-image:latest
docker run -d --name frontend --network clearpath-net -p 3000:80 clearpath-frontend-image:latest
```

The named `clearpath-mongo-data` volume preserves requests when the database container is replaced. The frontend image is built with `VITE_API_URL=/api`, so the browser uses the same host and Nginx forwards `/api/` to `backend:5000`. The database is reachable on host port `27017`; the backend and frontend are reachable on `5000` and `3000`.

## Jenkins

The root `Jenkinsfile` is a Declarative Pipeline for a Windows Jenkins agent with Docker CLI access and the Jenkins Pipeline PowerShell step. It checks out and verifies the source, builds and verifies the three tagged images, ensures the Docker network, replaces the named containers, and checks both health URLs.

## Push the application branch

The project is prepared on `Application_code`. Review and commit locally when ready, then push:

```powershell
cd E:\GITHUB\TWO-TIER\TWO-TIER-CICD-APPLICATION
git add .
git commit -m "Build Clearpath work request tracker"
git push -u origin Application_code
```
