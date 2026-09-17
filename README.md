# BLPA process map

Interactive process map for the Bangladesh Land Port Authority IBMS work: AS-IS and TO-BE import and export flows at Benapole, Bhomra and Burimari, with time figures, a re-engineering table, analytics and a comment layer.

## Files

| File | What it is |
|---|---|
| `index.html` | The map, one self-contained page (same content as `BLPA_Process_Map_v1.html`) |
| `server.js` | Page host and shared comment store; no dependencies, Node 18 or later |
| `data/` | Created by the server: `feedback.json` (all comments) and `feedback.log.jsonl` (every change). Not in git |

## Hosting so that comments are shared

Comments are shared only when the page is served by `server.js`. Opened as a file, or hosted as a static page without the server, comments stay in the reader's browser.

```
node server.js
```

Environment variables: `PORT` (default 8080), `HOST` (default 0.0.0.0), `DATA_DIR` (default `./data`). Put the folder on any host that runs Node (a VPS, Azure App Service, Render, Railway, a Docker container) and share the URL. Keep `data/` on persistent storage and back it up; it is the only copy of the comments.

The API the page uses:

| Method and path | Does |
|---|---|
| `GET /api/feedback` | Returns every comment |
| `POST /api/feedback` | Adds a comment (a comment with a known id is ignored, so re-sending is safe) |
| `PUT /api/feedback/{id}` | Edits the text of a comment; only the original author's browser can edit |

There is no delete. The page also keeps a copy of the comments in the reader's browser and re-sends anything the server did not receive.

### Page hosted elsewhere, server hosted separately

If the page is served from a static host (for example GitHub Pages) and `server.js` runs on another address, open `index.html` and set the address near the top:

```
window.BLPA_FEEDBACK_API = 'https://your-host.example.org/api/feedback';
```

The server answers cross-origin requests.

