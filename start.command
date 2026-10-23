#!/bin/bash
# Double-click this file (macOS) to open Plainly in your browser.
cd "$(dirname "$0")"
PORT=5173
(sleep 1 && open "http://localhost:$PORT") &
echo "Plainly is running at http://localhost:$PORT  (close this window to stop it)"
python3 -m http.server "$PORT"
