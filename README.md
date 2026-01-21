# Jellyfin Live

A modern, responsive dashboard for managing Jellyfin Live TV and DVR.

## What is this?

Jellyfin Live is a standalone web application that interfaces with your Jellyfin server to provide a better experience for:
- Viewing the Live TV Guide (EPG)
- Managing Scheduled Recordings
- Browsing Monitored Series
- Seeing what's On Air and upcoming Premieres

It uses your existing Jellyfin credentials to log in.

## Quick Start

The fastest way to get running is using Docker Compose.

### 1. Clone the repository

```bash
git clone https://github.com/willuhmjs/jellyfin-live.git
cd jellyfin-live
```

### 2. Launch

```bash
docker-compose up -d --build
```

This will build the application and a Postgres database. The app will be available at [http://localhost:3000](http://localhost:3000).

### 3. Login

Use your Jellyfin server URL and your user credentials to log in.

## Development

If you want to run it without Docker:

1.  Copy `.env.example` to `.env` and configure your database URL.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Start the development server:
    ```bash
    pnpm dev
    ```
