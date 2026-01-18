# Jellyfin Live

Jellyfin Live is a custom frontend application designed specifically for managing Jellyfin's Live TV and DVR capabilities. It provides a streamlined and dedicated interface for your live television needs.

## Features

-   **Authentication:** Securely log in using your existing Jellyfin credentials.
-   **Live TV Guide:** Browse a comprehensive grid view of your channel lineups and upcoming programs.
-   **Schedule Recordings:** Easily set up recordings for single programs or entire series.
-   **Library Browsing:** Access your media libraries directly through the interface.
-   **Search:** Quickly find programs, series, and movies.

## Tech Stack

-   [SvelteKit](https://kit.svelte.dev/)
-   [TailwindCSS](https://tailwindcss.com/)
-   [Jellyfin API](https://api.jellyfin.org/)
-   [PostgreSQL](https://www.postgresql.org/)

## Docker Deployment

The recommended way to deploy Jellyfin Live is using Docker.

### Docker Compose

Create a `docker-compose.yml` file with the following configuration:

```yaml
services:
  jellyfin-live:
    image: ghcr.io/willuhmjs/jellyfin-live:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://jellyfin:jellyfin@postgres:5432/jellyfin
      - ORIGIN=http://localhost:3000
    depends_on:
      - postgres

  postgres:
    image: postgres:18
    environment:
      - POSTGRES_USER=jellyfin
      - POSTGRES_PASSWORD=jellyfin
      - POSTGRES_DB=jellyfin
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

Run the container:

```bash
docker-compose up -d
```

## Local Development

If you wish to contribute or run the application locally without Docker, follow these steps.

### Prerequisites

-   A running [Jellyfin](https://jellyfin.org/) server.
-   Node.js.
-   PostgreSQL database.

### Configuration

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

2.  Update the `.env` file with your PostgreSQL configuration:
    ```env
    POSTGRES_USER=jellyfin
    POSTGRES_PASSWORD=jellyfin
    POSTGRES_DB=jellyfin
    DATABASE_URL=postgresql://jellyfin:jellyfin@localhost:5432/jellyfin
    ```

3.  **Onboarding:** Upon first launch, the application will guide you through an onboarding process to configure your Jellyfin server URL.

### Running Locally

Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app manually, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
