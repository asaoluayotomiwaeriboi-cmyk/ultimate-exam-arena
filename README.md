# Ultimate CBT Web Application

A modern full-stack CBT platform built with Node.js, Express, PostgreSQL, and vanilla HTML/CSS/JavaScript.

## Features

- Landing page with professional, responsive CBT-inspired design
- Student signup/login and admin login
- Student dashboard with exam selection and history tracking
- JAMB-style exam interface with timer, question palette, fullscreen mode, and calculator popup
- Admin panel for managing questions, subjects, students, live sessions, and analytics
- PostgreSQL backend for users, questions, subjects, exam sessions, and results
- Dark mode, anti-cheat tab warnings, and mobile-first layout

## Project Structure

- `backend/` - Express server, API routes, models, controllers
- `frontend/` - Static HTML, CSS, and JavaScript client pages
- `database/` - database helpers and seed scripts to initialize subjects, sample questions, and admin account

## Setup

1. Copy `.env.example` to `.env`
2. Update `PORT`, `JWT_SECRET`, `DATABASE_URL`, and admin credentials
3. Install packages:
   ```bash
   npm install
   ```
4. Seed the database:
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

## Deployment

This app is ready for Replit or any Node.js hosting environment. Use `npm start` to run the Express server.

### Postgres configuration

The app now uses PostgreSQL instead of SQLite. Set `DATABASE_URL` in `.env`, for example:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ultimate_cbt
```

If you want the app to stay running even after you log out, use a process manager such as PM2 or Docker.

### Cross-device and LAN access

To let other devices on your local network access the app, start the server with:

```bash
HOST=0.0.0.0 PORT=5000 npm start
```

Then open `http://<machine-ip>:5000` from the other device. Make sure your firewall allows port `5000`.

For public access from outside your network, use a tunneling service such as ngrok:

```bash
ngrok http 5000
```

Copy the generated public URL and use it to access the app from any device.

### Capacity and scaling notes

This application now uses PostgreSQL, which gives much higher write throughput and concurrency than SQLite. For larger classes or serious production use, keep using Postgres, run multiple Node.js instances behind a load balancer, and use a managed database service when possible.

Key capacity considerations:
- PostgreSQL scales much better than SQLite for multiple users.
- Use a separate Postgres server or managed DB instance for real traffic.
- Use a process manager such as PM2 or Docker Compose to keep the app running permanently.

### Run permanently with PM2

Install PM2 globally and start the app:

```bash
npm install -g pm2
npm run pm2
pm save
pm startup
```

Stop the app with:

```bash
pm2 stop ultimate-cbt
```

### Run permanently with Docker Compose

Start the app and the Postgres service in the background:

```bash
npm run docker:up
```

Because the compose file uses `restart: always`, Docker will attempt to restart the app and database if they crash.

On Windows, make sure Docker Desktop is set to start automatically on system boot so the website stays available after reboot.

Stop it with:

```bash
npm run docker:down
```

### Deploying like a normal website

For a true website setup, deploy this Docker stack to a host that is always online:

This project is already container-ready, so the easiest path is:
1. Install Docker on the host
2. Copy this project there
3. Create a production environment file from `.env.prod.example` and set your `DOMAIN` and `LETSENCRYPT_EMAIL`.
4. Run the production compose stack and expose ports 80/443:
4. Point the host's public domain or IP to port `4000`
```bash
cp .env.prod.example .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

5. Point your domain's A record to the host public IP and wait for DNS to propagate. Traefik will request TLS automatically using Let's Encrypt.
If you want, I can also add a simple `docker-compose.prod.yml` and a documented production deployment checklist.

For production deployment with Docker:

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. Or build and run manually:
   ```bash
   docker build -t ultimate-cbt .
   docker run -p 5000:5000 --env-file .env ultimate-cbt
   ```

The Docker setup includes:
- Node.js 18 Alpine image for smaller size
- Non-root user for security
- Health check endpoint
- PostgreSQL database connectivity via `DATABASE_URL`
- Persistent data volume for the application
## Notes

- Admin login uses the seeded admin user from `.env`
- Visit `/login.html` for student and admin login
- Admin users are redirected to `/admin.html`, students to `/dashboard.html`
- Student exam workflow is protected with JWT tokens and secure API endpoints
- The server returns a proper JSON 404 for unknown `/api/*` routes and falls back to the frontend for other routes
- Questions are randomized for each exam session and stored per student
