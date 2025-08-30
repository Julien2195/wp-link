# API — cURL templates

Définissez d’abord la variable `BASE` vers votre API:

```bash
BASE="${VITE_API_BASE_URL:-http://localhost:8000/api}"
```

Si vous utilisez WordPress REST avec nonce:

```bash
WP_NONCE="VOTRE_NONCE"
COMMON_HEADERS=(
  -H "Content-Type: application/json"
  -H "Accept: application/json"
  -H "X-WP-Nonce: ${WP_NONCE}"
)
```

Sinon, utilisez les en-têtes JSON simples:

```bash
COMMON_HEADERS=(
  -H "Content-Type: application/json"
  -H "Accept: application/json"
)
```

## Health

```bash
curl -i "${BASE}/health"
```

## Créer un scan

```bash
curl -i -X POST "${BASE}/scans" \
  "${COMMON_HEADERS[@]}" \
  -d '{
    "includeMenus": true,
    "includeWidgets": true,
    "followRedirects": true
  }'
```

Réponse attendue:

```json
{ "id": 123, "status": "pending", "startedAt": "2025-08-29T21:00:00Z" }
```

## Lister les scans (historique)

```bash
curl -i "${BASE}/scans?page=1&perPage=20"
```

Réponse attendue:

```json
{ "items": [ { "id": 123, "status": "completed", "total": 600, "ok": 552, "broken": 18, "redirect": 30 } ], "total": 1, "page": 1, "perPage": 20 }
```

## Détail / statut d’un scan

```bash
curl -i "${BASE}/scans/123"
```

Réponse attendue:

```json
{ "id": 123, "status": "running", "processedLinks": 240, "totalLinks": 600 }
```

## Résultats d’un scan (liens)

```bash
curl -i "${BASE}/scans/123/links?page=1&perPage=50&type=external&status=broken&search=example&sortBy=url&sortDir=asc"
```

Réponse attendue:

```json
{ "items": [ { "id": 1, "url": "https://example.com", "type": "external", "status": "broken", "source": "Page: Accueil", "httpCode": 404 } ], "total": 22, "page": 1, "perPage": 50 }
```

## Télécharger un rapport

```bash
curl -L -X GET "${BASE}/scans/123/report" -o scan-123-report.pdf
```

## Annuler un scan (optionnel)

```bash
curl -i -X POST "${BASE}/scans/123/cancel" "${COMMON_HEADERS[@]}"
```

---

Notes:
- Adaptez les routes si votre backend expose un préfixe différent (ex: `/wp-json/wpls/v1`).
- Remplacez ou supprimez l’en-tête `X-WP-Nonce` selon votre mécanisme d’authentification.

