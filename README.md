# Secure File Sharing App

This repository contains a secure file-sharing application composed of a Node.js + Express backend and a React frontend. The app supports user authentication, role-based access (admin/user), file uploads and downloads, and basic admin operations.

## Repository structure

- `backend/` — Express API, data models, and file storage
  - `server.js` — backend entrypoint
  - `config/` — database and other configuration
  - `controllers/` — route handlers (auth, admin, files)
  - `middleware/` — auth checks and other middleware
  - `models/` — database models (e.g., `user.js`)
  - `routes/` — route definitions grouped by feature
  - `uploads/` — stored uploaded files (ignored by git)
  - `.env` — environment variables (DO NOT commit)

- `frontend/` — React single-page application
  - `public/` — static HTML and assets
  - `src/` — React components, context, and styles

## Key features

- User registration and login (JWT-based auth)
- File upload and download with server-side storage
- Role-based access (admin dashboard for managing users/files)
- Simple REST API consumed by the React frontend

## Tech stack

- Backend: Node.js, Express, SQLite (file-based) — e.g. using `sqlite3`, `better-sqlite3`, or an ORM like `Sequelize` with the `sqlite` dialect
- Frontend: React (Create React App structure) + Context for auth
- Authentication: JWT tokens

## Backend — detailed

### Purpose

The backend handles data persistence, authentication, file storage and business logic. It exposes REST endpoints for the frontend and enforces access control.

### Important files

- `backend/server.js` — app bootstrap, middleware registration, and route mounting
- `backend/config/database.js` — db connection helper
- `backend/controllers/` — business logic (authController, fileController, adminController)
- `backend/middleware/authMiddleware.js` — validates JWT and enforces roles

### Environment variables

Use the provided `.env.example` as a template. Copy it to `backend/.env` and provide real values.

- `DATABASE_FILE` (or `SQLITE_FILE`) — path to the SQLite database file (for example `./backend/data/database.sqlite`). If your project uses a different env var name, use that instead.
- `JWT_SECRET` — secret used to sign JWTs (keep this secret)
- `PORT` — server port (default `5000`)
- `UPLOAD_DIR` — folder for uploaded files (default `uploads`)
- `NODE_ENV` — `development` or `production`
- `CLIENT_URL` — frontend URL for CORS (e.g., `http://localhost:3000`)

### Running the backend (development)

Open a PowerShell terminal and run:

```powershell
cd .\backend
npm install
copy .env.example .env  # then edit .env with real values
npm start   # or: node server.js
```

### API overview (examples)

- POST /api/auth/register — registers a new user (body: name, email, password)
- POST /api/auth/login — returns a JWT (body: email, password)
- GET /api/files — list files (auth required)
- POST /api/files — upload a file (auth required, multipart/form-data)
- GET /api/files/:id/download — download file (auth + permission checks)
- Admin routes under `/api/admin` to manage users/files (admin only)

Adjust these endpoints to match the exact routes in `backend/routes/*.js`.

### API examples (curl)

Replace `http://localhost:5000` with your backend URL and set the `Authorization` header to `Bearer <token>` for protected routes.

- Register a user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"StrongPass123"}'
```

- Login and get a token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"StrongPass123"}'
```

- Upload a file (multipart)

```bash
curl -X POST http://localhost:5000/api/files \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@/path/to/local-file.pdf" \
  -F "metadata={\"description\":\"Report Q4\"};type=application/json"
```

- Download a file

```bash
curl -X GET http://localhost:5000/api/files/<fileId>/download \
  -H "Authorization: Bearer <JWT_TOKEN>" --output downloaded-file.pdf
```

### Postman

You can import requests above into Postman by creating requests with the same method, URL and headers. For file uploads, use the form-data body type and choose `file` for the file field.

### Files and storage

- Uploaded files are stored on disk in `backend/uploads/`. Consider switching to cloud storage (S3, Azure Blob) for production.
- Ensure the `uploads` directory is writeable by the server process.

## Frontend — detailed

### Purpose

The frontend is a React single-page app that provides the user interface for registering, logging in, uploading and downloading files, and any admin UI.

### Important files

- `frontend/src/index.js` — app entry
- `frontend/src/App.js` — app routing and main layout
- `frontend/src/AuthContext.js` — provides auth state and helpers
- `frontend/src/components/*` — UI components (Login, Register, Dashboard, AdminDashboard, ProtectedRoute)

### Running the frontend (development)

```powershell
cd .\frontend
npm install
npm start
```

By default Create React App serves on `http://localhost:3000`. Update `CLIENT_URL` in your backend `.env` to match.

### Configuring API base URL

If the frontend expects an API base URL, set it in a config file or environment variable within the frontend (e.g., `.env` in `frontend` if using CRA: `REACT_APP_API_URL=http://localhost:5000`).

## Development workflow

1. Start backend server
2. Start frontend dev server
3. Use the frontend to call backend endpoints

Run each in separate terminals. Use the `.env.example` as a starting point.

## Security notes

- Never commit `.env` or any secrets.
- Use strong `JWT_SECRET` values and rotate them if they may be exposed.
- Consider rate limiting and virus scanning for uploaded files in production.
- Validate file types and restrict executable/malicious uploads.

## Testing

- Add unit tests for controllers and integration tests for critical endpoints.
- For frontend, add component/unit tests using Jest and React Testing Library.

## Deployment hints

- Backend: run with process manager (PM2) or containerize with Docker; use environment variables in CI/CD.
- Frontend: build static files (`npm run build`) and serve from a static host or behind a CDN.

## Contributing

- Fork, create a feature branch, open a pull request, and describe changes.
- Keep sensitive data out of commits. Add tests for new features.

## Useful files

- `.env.example` — template for backend environment variables
- `.gitignore` — ignores `node_modules`, `.env`, `backend/uploads`, etc.

## License

Add a license file if desired (for example, `LICENSE` with MIT). If you want, I can add a permissive MIT license file for you.

---



      
