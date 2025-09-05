#!/usr/bin/env bash
set -euo pipefail

SESSION="rolodex"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session $SESSION already exists. Attach with: tmux attach -t $SESSION"
  exit 0
fi

tmux new-session -d -s "$SESSION" -n backend

# Window 1: Backend
tmux send-keys -t "$SESSION:backend" 'cd backend && if [ -d venv ]; then . venv/bin/activate; fi && uvicorn backend.main:app --reload' C-m

# Window 2: Frontend
tmux new-window -t "$SESSION" -n frontend
tmux send-keys -t "$SESSION:frontend" 'cd frontend && npm run dev' C-m

# Window 3: Health
tmux new-window -t "$SESSION" -n health
tmux send-keys -t "$SESSION:health" 'watch -n2 curl -s http://localhost:8000/health' C-m

# Window 4: Tests
tmux new-window -t "$SESSION" -n tests
tmux split-window -t "$SESSION:tests" -h
tmux send-keys -t "$SESSION:tests.1" 'cd backend && pytest -q' C-m
tmux send-keys -t "$SESSION:tests.2" 'cd frontend && npm test -- --watchAll=false' C-m

echo "Started tmux session: $SESSION"
echo "Attach with: tmux attach -t $SESSION"

