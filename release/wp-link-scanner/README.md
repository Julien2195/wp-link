# WP Link Scanner (Frontend)

Interface d’administration (React + Vite) pour le plugin WordPress « WP Link Scanner ».

Cette v1 fournit seulement le frontend. Le backend (scan réel et API REST) pourra être ajouté ensuite.

## Démarrage

1. Installer les dépendances:
   - `npm install`
2. Développer en local:
   - `npm run dev`
3. Construire pour WordPress (génère `build/` + `manifest.json`):
   - `npm run build`

Placez ce dossier dans `wp-content/plugins/wp-link` puis activez-le depuis l’admin WordPress.

Le fichier PHP `wp-link.php` charge automatiquement les assets packagés (JS/CSS) en lisant `build/manifest.json`.

## Appels API (axios)

- Client HTTP: `axios` est ajouté et configuré dans `src/api/client.js`.
- Fonctions prêtes à l’emploi dans `src/api/endpoints.js`:
  - `getHealth()` → `GET /health`
  - `startScan(options)` → `POST /scans`
  - `listScans(params)` → `GET /scans`
  - `getScan(id)` → `GET /scans/{id}`
  - `getScanResults(id, params)` → `GET /scans/{id}/links`
  - `downloadScanReport(id)` → `GET /scans/{id}/report` (blob)

### Configuration de l’URL API

- Définir la variable Vite `VITE_API_BASE_URL` (ex: `https://api.local/api`).
- Exemple fichier `.env` à la racine du projet Vite:

```
VITE_API_BASE_URL=https://localhost:8000/api
```

Par défaut, le client utilise `/api`.

### cURL prêt à l’emploi

Consultez `docs/API_CURLS.md` pour des commandes cURL correspondant à chaque endpoint.

## Structure

Voir `instuctrion.md` et la structure du projet dans ce dépôt (`src/`, `styles/`, `build/`).
