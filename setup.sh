#!/bin/bash
# =============================================================================
# AUTOPILATE — Environment Setup
# Run once on a fresh Mac Mini M4 (or dev machine). Delete after.
# =============================================================================
#
# USAGE:
#   chmod +x setup.sh && ./setup.sh
#
# This sets up: macOS tooling, Node.js, PostgreSQL, Redis, PM2, Caddy,
# OpenClaw, ClawHub, agent tools, Cloudflare Tunnel, and project scaffolding.

set -e

echo "================================================"
echo "  AUTOPILATE — Fresh Machine Setup"
echo "================================================"
echo ""

# --- 1. Homebrew ---
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v brew &> /dev/null; then
        echo "→ Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    else
        echo "✓ Homebrew already installed"
    fi
fi

# --- 2. Ghostty terminal ---
echo "→ Installing Ghostty..."
brew install --cask ghostty 2>/dev/null || echo "✓ Ghostty already installed"

# --- 3. tmux ---
echo "→ Installing tmux..."
brew install tmux 2>/dev/null || echo "✓ tmux already installed"

# --- 4. Configure tmux ---
cat << 'TMUX_EOF' > ~/.tmux.conf
set -g mouse on
set -g history-limit 50000
set -g status-interval 5
set -g status-left-length 40
set -g status-left '#[fg=green]#S #[fg=white]| '
set -g status-right '#[fg=yellow]%H:%M'
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D
TMUX_EOF
echo "✓ tmux configured"

# --- 5. Node.js (LTS) ---
echo "→ Installing Node.js..."
brew install node 2>/dev/null || echo "✓ Node.js already installed"

# --- 6. Git ---
echo "→ Ensuring Git is up to date..."
brew install git 2>/dev/null || echo "✓ Git already installed"

# --- 7. PostgreSQL ---
echo "→ Installing PostgreSQL..."
brew install postgresql@16 2>/dev/null || echo "✓ PostgreSQL already installed"
brew services start postgresql@16 2>/dev/null || echo "✓ PostgreSQL already running"
echo "✓ PostgreSQL 16"

# --- 8. Redis ---
echo "→ Installing Redis..."
brew install redis 2>/dev/null || echo "✓ Redis already installed"
brew services start redis 2>/dev/null || echo "✓ Redis already running"
echo "✓ Redis"

# --- 9. PM2 ---
echo "→ Installing PM2..."
npm install -g pm2 2>/dev/null || echo "✓ PM2 already installed"
echo "✓ PM2"

# --- 10. Caddy (reverse proxy) ---
echo "→ Installing Caddy..."
brew install caddy 2>/dev/null || echo "✓ Caddy already installed"
echo "✓ Caddy"

# --- 11. Cloudflare Tunnel ---
echo "→ Installing cloudflared..."
brew install cloudflare/cloudflare/cloudflared 2>/dev/null || echo "✓ cloudflared already installed"
echo "✓ Cloudflare Tunnel"

# --- 12. Tailscale ---
echo "→ Installing Tailscale..."
brew install --cask tailscale 2>/dev/null || echo "✓ Tailscale already installed"
echo "✓ Tailscale"

# --- 13. Ollama (local model inference) ---
echo "→ Installing Ollama..."
brew install ollama 2>/dev/null || echo "✓ Ollama already installed"
echo "✓ Ollama"

# --- 14. Claude Code ---
echo "→ Installing Claude Code..."
npm install -g @anthropic-ai/claude-code 2>/dev/null || echo "✓ Claude Code already installed"

# --- 15. Core Agent Tools ---
echo ""
echo "→ Installing core agent tools..."

npm install -g @steipete/poltergeist 2>/dev/null || true
brew install watchman 2>/dev/null || true
echo "  ✓ Poltergeist + Watchman"

brew install steipete/tap/peekaboo 2>/dev/null || true
echo "  ✓ Peekaboo"

npm install -g @steipete/oracle 2>/dev/null || true
echo "  ✓ Oracle"

npm install -g @steipete/summarize 2>/dev/null || true
echo "  ✓ Summarize"

npm install -g mcporter 2>/dev/null || true
echo "  ✓ MCPorter"

brew install ast-grep 2>/dev/null || true
echo "  ✓ ast-grep"

# --- 16. Project-specific dependencies ---
echo ""
echo "→ Installing AUTOPILATE-specific dependencies..."

# pnpm for monorepo management
npm install -g pnpm 2>/dev/null || true
echo "  ✓ pnpm"

# Vite (used by VAB)
npm install -g vite 2>/dev/null || true
echo "  ✓ Vite"

# TypeScript
npm install -g typescript 2>/dev/null || true
echo "  ✓ TypeScript"

# jq for JSON processing in scripts
brew install jq 2>/dev/null || true
echo "  ✓ jq"

echo "  ✓ Project dependencies installed"

# --- 17. Clone OpenClaw + ClawHub ---
echo ""
echo "→ Setting up OpenClaw ecosystem..."
PROJECTS_DIR="$HOME/Projects"
mkdir -p "$PROJECTS_DIR"

if [ ! -d "$PROJECTS_DIR/openclaw" ]; then
    echo "  → Cloning OpenClaw..."
    git clone https://github.com/openclaw/openclaw.git "$PROJECTS_DIR/openclaw"
    cd "$PROJECTS_DIR/openclaw" && npm install
    echo "  ✓ OpenClaw cloned and installed"
else
    echo "  ✓ OpenClaw already cloned"
fi

if [ ! -d "$PROJECTS_DIR/clawhub" ]; then
    echo "  → Cloning ClawHub..."
    git clone https://github.com/openclaw/clawhub.git "$PROJECTS_DIR/clawhub"
    echo "  ✓ ClawHub cloned"
else
    echo "  ✓ ClawHub already cloned"
fi

# --- 18. Create AUTOPILATE project directory ---
PROJECT_DIR="$PROJECTS_DIR/autopilate"
echo ""
echo "→ Setting up AUTOPILATE at $PROJECT_DIR..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [ ! -d .git ]; then
    git init
    cat << 'GITIGNORE_EOF' > .gitignore
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.turbo/
GITIGNORE_EOF
    git add -A && git commit -m "initial commit"
fi

# Create docs directory
mkdir -p docs

# Initialize Poltergeist
if [ ! -f poltergeist.config.json ]; then
    poltergeist init 2>/dev/null || echo "  (Run 'poltergeist init' manually after project setup)"
fi

# Symlink AGENTS.md -> CLAUDE.md
if [ -f AGENTS.md ] && [ ! -L CLAUDE.md ]; then
    ln -s AGENTS.md CLAUDE.md
    echo "  ✓ CLAUDE.md symlinked to AGENTS.md"
fi

# --- 19. Create PostgreSQL database ---
echo ""
echo "→ Creating AUTOPILATE database..."
createdb autopilate 2>/dev/null || echo "  ✓ Database 'autopilate' already exists"

# --- 20. API Keys ---
echo ""
echo "================================================"
echo "  SET YOUR API KEYS"
echo "================================================"
echo ""
echo "Add these to ~/.zshrc:"
echo ""
echo '  export ANTHROPIC_API_KEY="sk-ant-..."'
echo '  export OPENAI_API_KEY="sk-..."'
echo '  export DATABASE_URL="postgresql://localhost:5432/autopilate"'
echo '  export REDIS_URL="redis://localhost:6379"'
echo '  # export CLOUDFLARE_TUNNEL_TOKEN="..."  # after tunnel setup'
echo '  # export TAVILY_API_KEY="..."            # for web research agents'
echo '  # export VERCEL_TOKEN="..."              # for web artifact deployment'
echo '  # export SLACK_BOT_TOKEN="xoxb-..."      # for Slack channel'
echo '  # export WHATSAPP_TOKEN="..."            # for WhatsApp channel'
echo ""
echo "Then: source ~/.zshrc"
echo ""

echo "================================================"
echo "  SETUP COMPLETE"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Set your API keys in ~/.zshrc"
echo "  2. Open Ghostty"
echo "  3. cd $PROJECT_DIR"
echo "  4. Start tmux: tmux new-session -s autopilate"
echo "  5. Start Poltergeist: poltergeist haunt"
echo "  6. Start Claude Code: claude --dangerously-skip-permissions"
echo "  7. Paste the first task from docs/sprint-plan.md"
echo ""
