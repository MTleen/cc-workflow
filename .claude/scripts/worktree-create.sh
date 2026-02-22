#!/bin/bash
# =============================================================================
# worktree-create.sh - Create isolated git worktree for development
# =============================================================================
# This script creates a new git worktree for a specific requirement/feature,
# providing isolated development environment with proper configuration.
#
# Usage:
#   ./worktree-create.sh <requirement-name> [branch-name]
#
# Arguments:
#   requirement-name: Name of the requirement (e.g., "2026-02-22-user-auth")
#   branch-name: Optional branch name (defaults to "feature/<requirement-name>")
#
# Examples:
#   ./worktree-create.sh 2026-02-22-user-auth
#   ./worktree-create.sh 2026-02-22-user-auth feature/auth-rewrite
#
# Exit codes:
#   0 - Success
#   1 - Configuration error
#   2 - Worktree already exists
#   3 - Git operation failed
#   4 - File copy failed
#   5 - Post-create command failed
# =============================================================================

set -e  # Exit on any error

# =============================================================================
# Color output helpers
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Validate arguments
# =============================================================================
if [ -z "$1" ]; then
    log_error "Missing required argument: requirement-name"
    echo ""
    echo "Usage: $0 <requirement-name> [branch-name]"
    echo ""
    echo "Examples:"
    echo "  $0 2026-02-22-user-auth"
    echo "  $0 2026-02-22-user-auth feature/auth-rewrite"
    exit 1
fi

REQUIREMENT_NAME="$1"
BRANCH_NAME="${2:-feature/$REQUIREMENT_NAME}"

# =============================================================================
# Resolve paths
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.ideal/worktree.yaml"

log_info "Project root: $PROJECT_ROOT"
log_info "Requirement: $REQUIREMENT_NAME"
log_info "Branch: $BRANCH_NAME"

# =============================================================================
# Load configuration
# =============================================================================
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    log_info "Please create .ideal/worktree.yaml with required configuration."
    exit 1
fi

# Parse YAML configuration (simple grep-based parser)
WORKTREE_DIR=$(grep -E '^worktree_dir:' "$CONFIG_FILE" | sed 's/worktree_dir: *//' | tr -d '"')

# Resolve worktree directory path
if [[ "$WORKTREE_DIR" == ../* ]]; then
    # Relative path from project root
    WORKTREE_PATH="$(cd "$PROJECT_ROOT/$(dirname "$WORKTREE_DIR")" 2>/dev/null && pwd)/$(basename "$WORKTREE_DIR")"
else
    # Absolute path or relative to current directory
    WORKTREE_PATH="$WORKTREE_DIR"
fi

TARGET_DIR="$WORKTREE_PATH/$REQUIREMENT_NAME"

log_info "Worktree directory: $TARGET_DIR"

# =============================================================================
# Check if worktree already exists
# =============================================================================
if [ -d "$TARGET_DIR" ]; then
    log_error "Worktree already exists: $TARGET_DIR"
    log_info "To remove it first, run: $SCRIPT_DIR/worktree-remove.sh $REQUIREMENT_NAME"
    exit 2
fi

# Check if branch exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    log_warning "Branch '$BRANCH_NAME' already exists"
    log_info "Will checkout existing branch in new worktree"
fi

# =============================================================================
# Create worktree directory parent
# =============================================================================
mkdir -p "$WORKTREE_PATH"
log_success "Created worktree parent directory: $WORKTREE_PATH"

# =============================================================================
# Create git worktree
# =============================================================================
log_info "Creating git worktree..."

cd "$PROJECT_ROOT"

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    # Branch exists, create worktree with existing branch
    if git worktree add "$TARGET_DIR" "$BRANCH_NAME" 2>&1; then
        log_success "Created worktree with existing branch: $BRANCH_NAME"
    else
        log_error "Failed to create worktree with existing branch"
        exit 3
    fi
else
    # Create new branch and worktree
    if git worktree add -b "$BRANCH_NAME" "$TARGET_DIR" 2>&1; then
        log_success "Created worktree with new branch: $BRANCH_NAME"
    else
        log_error "Failed to create worktree with new branch"
        exit 3
    fi
fi

# =============================================================================
# Copy environment files
# =============================================================================
log_info "Copying environment files..."

# Parse copy list from YAML
copy_files=$(grep -A 100 '^copy:' "$CONFIG_FILE" | grep -E '^  - ' | sed 's/  - //')

for file in $copy_files; do
    src_file="$PROJECT_ROOT/$file"
    dest_file="$TARGET_DIR/$file"

    if [ -f "$src_file" ]; then
        # Create destination directory if needed
        mkdir -p "$(dirname "$dest_file")"

        if cp "$src_file" "$dest_file"; then
            log_success "Copied: $file"
        else
            log_warning "Failed to copy: $file"
        fi
    else
        log_warning "Source file not found, skipping: $file"
    fi
done

# =============================================================================
# Run post-create commands
# =============================================================================
log_info "Running post-create commands..."

# Parse post_create list from YAML
post_commands=$(grep -A 100 '^post_create:' "$CONFIG_FILE" | grep -E '^  - ' | sed 's/  - //')

cd "$TARGET_DIR"

for cmd in $post_commands; do
    log_info "Executing: $cmd"

    if eval "$cmd" 2>&1; then
        log_success "Command completed: $cmd"
    else
        log_error "Command failed: $cmd"
        log_warning "Worktree created but initialization incomplete"
        log_info "You may need to manually run: $cmd"
        exit 5
    fi
done

# =============================================================================
# Write .ideal/.current-task file
# =============================================================================
log_info "Writing current task marker..."

mkdir -p "$TARGET_DIR/.ideal"
CURRENT_TASK_FILE="$TARGET_DIR/.ideal/.current-task"

cat > "$CURRENT_TASK_FILE" << EOF
# Current Task Marker
# This file indicates the active development task in this worktree
# Generated by worktree-create.sh on $(date)

requirement: $REQUIREMENT_NAME
branch: $BRANCH_NAME
created_at: $(date -Iseconds)
worktree_path: $TARGET_DIR
project_root: $PROJECT_ROOT
EOF

log_success "Created: .ideal/.current-task"

# =============================================================================
# Success summary
# =============================================================================
echo ""
echo "========================================"
log_success "Worktree created successfully!"
echo "========================================"
echo ""
echo "Worktree location: $TARGET_DIR"
echo "Branch: $BRANCH_NAME"
echo ""
echo "To start working:"
echo "  cd $TARGET_DIR"
echo ""
echo "To remove worktree:"
echo "  $SCRIPT_DIR/worktree-remove.sh $REQUIREMENT_NAME"
echo ""

exit 0
