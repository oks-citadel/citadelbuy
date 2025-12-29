#!/usr/bin/env bash
# ==========================================
# Dockerfile Large File Linter
# Prevents: large files in build context,
# encoding transforms on data/models,
# missing .dockerignore patterns
# ==========================================
set -euo pipefail

echo "=== Dockerfile Large File Linter ==="

DOCKERFILES=$(find . -maxdepth 5 -name 'Dockerfile*' -type f 2>/dev/null || true)
FAIL=0

# Check .dockerignore exists
if [[ ! -f .dockerignore ]]; then
  echo "ERROR: .dockerignore missing"
  FAIL=1
else
  # Check for common large asset exclusions
  if ! grep -qE '(^data/|^models/|\*\.zip|\*\.tar|\*\.parquet|\*\.csv|node_modules)' .dockerignore 2>/dev/null; then
    echo "WARNING: .dockerignore may not exclude common large assets (data/, models/, archives, datasets)"
  fi
  echo "OK: .dockerignore exists"
fi

# Lint each Dockerfile
for df in $DOCKERFILES; do
  echo ""
  echo "Linting: $df"

  # Check for COPY of large directories
  if grep -nE '^\s*COPY\s+(\.\/)?(data|models)\b' "$df" >/dev/null 2>&1; then
    echo "ERROR: $df copies data/ or models/ into image. Use runtime mount or Blob download."
    FAIL=1
  fi

  # Check for encoding transforms on data/models directories
  if grep -nE '(dos2unix|iconv|sed -i).*(data/|models/)' "$df" >/dev/null 2>&1; then
    echo "ERROR: $df applies encoding transforms to data/models. Avoid build-time transforms on large files."
    FAIL=1
  fi

  # Check for UTF-8 locale (best practice)
  if ! grep -qE 'LANG=.*UTF-8|LC_ALL=.*UTF-8' "$df" 2>/dev/null; then
    echo "WARNING: $df missing UTF-8 locale (LANG/LC_ALL). Recommended for encoding safety."
  fi

  # Check for SHELL directive (best practice for bash)
  if ! grep -qE 'SHELL \[' "$df" 2>/dev/null; then
    echo "WARNING: $df missing SHELL directive. Consider SHELL [\"/bin/bash\", \"-c\"] for consistent behavior."
  fi

  echo "OK: $df passed linting"
done

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "=== All Dockerfile checks passed ==="
  exit 0
else
  echo "=== Dockerfile linting FAILED ==="
  exit 1
fi
