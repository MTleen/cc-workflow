#!/bin/bash
# =============================================================================
# worktree-remove.sh - Remove git worktree after development completion
# =============================================================================
# This script safely removes a git worktree after verifying that the code
# has been merged and there are no uncommitted changes.
#
# Usage:
#   ./worktree-remove.sh <requirement-name> [--force] [--delete-branch]
#
# Arguments:
#   requirement-name: Name of the requirement (e.g., "2026-02-22-user-auth")
#   --force: Skip confirmation prompts
#   --delete-branch: Also delete the associated git branch
#
# Examples:
#   ./worktree-remove.sh 2026-02-22-user-auth
#   ./worktree-remove.sh 2026-02-22-user-auth --force --delete-branch
#
# Exit codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Worktree not found
#   3 - Uncommitted changes exist
#   4 - Code not merged (without --force)
#   5 - Git operation failed
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
# Parse arguments
# =============================================================================
if [ -z "$1" ]; then
    log_error "Missing required argument: requirement-name"
    echo ""
    echo "Usage: $0 <requirement-name> [--force] [--delete-branch]"
    echo ""
    echo "Options:"
    echo "  --force         Skip confirmation prompts"
    echo "  --delete-branch Also delete the associated git branch"
    echo ""
    echo "Examples:"
    echo "  $0 2026-02-22-user-auth"
    echo "  $0 2026-02-22-user-auth --force --delete-branch"
    exit 1
fi

REQUIREMENT_NAME="$1"
shift

FORCE=false
DELETE_BRANCH=false

while [ $# -gt 0 ]; do
    case "$1" in
        --force)
            FORCE=true
            shift
            ;;
        --delete-branch)
            DELETE_BRANCH=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Resolve paths
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.ideal/worktree.yaml"

log_info "Project root: $PROJECT_ROOT"
log_info "Requirement: $REQUIREMENT_NAME"

# =============================================================================
# Load configuration
# =============================================================================
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Parse YAML configuration
WORKTREE_DIR=$(grep -E '^worktree_dir:' "$CONFIG_FILE" | sed 's/worktree_dir: *//' | tr -d '"')

# Resolve worktree directory path
if [[ "$WORKTREE_DIR" == ../* ]]; then
    WORKTREE_PATH="$(cd "$PROJECT_ROOT/$(dirname "$WORKTREE_DIR")" 2>/dev/null && pwd)/$(basename "$WORKTREE_DIR")"
else
    WORKTREE_PATH="$WORKTREE_DIR"
fi

TARGET_DIR="$WORKTREE_PATH/$REQUIREMENT_NAME"

log_info "Worktree directory: $TARGET_DIR"

# =============================================================================
# Verify worktree exists
# =============================================================================
if [ ! -d "$TARGET_DIR" ]; then
    log_error "Worktree not found: $TARGET_DIR"
    log_info "Available worktrees:"
    git worktree list 2>/dev/null || true
    exit 2
fi

# =============================================================================
# Check for uncommitted changes
# =============================================================================
log_info "Checking for uncommitted changes..."

cd "$TARGET_DIR"

if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    log_error "Uncommitted changes detected in worktree"
    log_info ""
    log_info "Modified files:"
    git status --short 2>/dev/null || true
    log_info ""
    log_error "Please commit or stash changes before removing worktree"
    log_info "Or use --force to remove anyway (changes will be lost)"

    if [ "$FORCE" = true ]; then
        log_warning "FORCE mode: Proceeding despite uncommitted changes"
    else
        exit 3
    fi
fi

# =============================================================================
# Get branch name from current task file or git
# =============================================================================
CURRENT_TASK_FILE="$TARGET_DIR/.ideal/.current-task"
if [ -f "$CURRENT_TASK_FILE" ]; then
    BRANCH_NAME=$(grep '^branch:' "$CURRENT_TASK_FILE" | sed 's/branch: *//')
fi

if [ -z "$BRANCH_NAME" ]; then
    BRANCH_NAME=$(git branch --show-current 2>/dev/null || echo "")
fi

log_info "Branch: ${BRANCH_NAME:-unknown}"

# =============================================================================
# Check if code is merged (unless --force)
# =============================================================================
if [ "$FORCE" = false ] && [ -n "$BRANCH_NAME" ]; then
    log_info "Checking if branch is merged..."

    cd "$PROJECT_ROOT"

    # Get default branch (main or master)
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

    if git branch --merged "$DEFAULT_BRANCH" 2>/dev/null | grep -q "$BRANCH_NAME"; then
        log_success "Branch '$BRANCH_NAME' is merged into $DEFAULT_BRANCH"
    else
        log_warning "Branch '$BRANCH_NAME' is NOT merged into $DEFAULT_BRANCH"
        log_info ""
        log_info "Unmerged commits:"
        git log "$DEFAULT_BRANCH..$BRANCH_NAME" --oneline 2>/dev/null | head -10 || true
        log_info ""
        log_warning "Removing an unmerged worktree may result in lost work"
        log_info "Use --force to remove anyway"

        # Ask for confirmation
        echo ""
        read -p "Continue removing unmerged worktree? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "Operation cancelled"
            exit 4
        fi
    fi
fi

# =============================================================================
# Confirmation (unless --force)
# =============================================================================
if [ "$FORCE" = false ]; then
    echo ""
    echo "About to remove worktree: $TARGET_DIR"
    [ "$DELETE_BRANCH" = true ] && echo "And delete branch: $BRANCH_NAME"
    echo ""
    read -p "Confirm removal? (y/N): " confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled"
        exit 0
    fi
fi

# =============================================================================
# Remove worktree
# =============================================================================
log_info "Removing worktree..."

cd "$PROJECT_ROOT"

if git worktree remove "$TARGET_DIR" 2>&1; then
    log_success "Worktree removed: $TARGET_DIR"
else
    log_error "Failed to remove worktree"
    log_info "Attempting force removal..."
    rm -rf "$TARGET_DIR"
    git worktree prune
    log_warning "Force removed worktree directory"
fi

# =============================================================================
# Delete branch (if requested)
# =============================================================================
if [ "$DELETE_BRANCH" = true ] && [ -n "$BRANCH_NAME" ]; then
    log_info "Deleting branch: $BRANCH_NAME"

    if git branch -d "$BRANCH_NAME" 2>&1; then
        log_success "Branch deleted: $BRANCH_NAME"
    else
        log_warning "Could not delete branch (may have unmerged commits)"
        log_info "To force delete: git branch -D $BRANCH_NAME"
    fi
fi

# =============================================================================
# Clean up empty parent directories
# =============================================================================
PARENT_DIR="$WORKTREE_PATH"
if [ -d "$PARENT_DIR" ] && [ -z "$(ls -A "$PARENT_DIR" 2>/dev/null)" ]; then
    log_info "Cleaning up empty directory: $PARENT_DIR"
    rmdir "$PARENT_DIR" 2>/dev/null || true
fi

# =============================================================================
# Success summary
# =============================================================================
echo ""
echo "========================================"
log_success "Worktree removal complete!"
echo "========================================"
echo ""
echo "Removed: $TARGET_DIR"
[ "$DELETE_BRANCH" = true ] && [ -n "$BRANCH_NAME" ] && echo "Deleted branch: $BRANCH_NAME"
echo ""

exit 0
