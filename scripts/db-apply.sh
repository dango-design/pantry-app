#!/usr/bin/env bash
#
# Applies pantry SQL to the hosted Supabase project this repo is linked to.
#
# Use this instead of `supabase db push`. The hosted project is shared with
# DoDone. `db push` records versions in a project-wide table that DoDone's own
# `db push` reads, and DoDone's push fails when it finds versions it does not
# have. This script runs the SQL file directly. Each pantry file records itself
# in pantry_private.schema_migrations, so a second run fails and changes nothing.
#
# Usage:
#   scripts/db-apply.sh status                 list the pantry files already applied
#   scripts/db-apply.sh apply <file.sql>       run one file against the linked project
#
# Before first use: supabase link --project-ref <ref of the shared project>

set -euo pipefail
cd "$(dirname "$0")/.."

usage() {
  sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

ref_file="supabase/.temp/project-ref"
if [[ ! -f "$ref_file" ]]; then
  echo "This repo is not linked to a Supabase project." >&2
  echo "Run: supabase link --project-ref <ref of the shared project>" >&2
  exit 1
fi
ref="$(cat "$ref_file")"

# Prints the lines of a SQL file with `--` comments removed.
strip_comments() {
  sed -E 's/--.*$//' "$1"
}

case "${1:-}" in
  status)
    echo "Project: $ref"
    supabase db query --remote --read-only \
      "select version, applied_at from pantry_private.schema_migrations order by version"
    ;;

  apply)
    file="${2:-}"
    [[ -n "$file" ]] || usage
    if [[ ! -f "$file" ]]; then
      echo "No such file: $file" >&2
      exit 1
    fi

    # The public schema belongs to DoDone. A pantry file must not name anything in it.
    if strip_comments "$file" | grep -nEi '(^|[^a-z_])public\.[a-z_"]' >&2; then
      echo "Refusing to run: the lines above name objects in the public schema." >&2
      exit 1
    fi

    # A trigger on auth.users would run for every app's sign-ups.
    if strip_comments "$file" | tr '\n' ' ' | grep -Eiq 'create[^;]*trigger[^;]*on +auth\.users'; then
      echo "Refusing to run: the file creates a trigger on auth.users." >&2
      exit 1
    fi

    # Every file must record itself, so that running it twice fails.
    if ! strip_comments "$file" | tr '\n' ' ' | grep -Eiq 'insert +into +pantry_private\.schema_migrations'; then
      echo "Refusing to run: the file does not insert its version into" >&2
      echo "pantry_private.schema_migrations." >&2
      exit 1
    fi

    echo "Project: $ref"
    echo "File:    $file"
    echo "The Supabase CLI will ask you to confirm before it changes the hosted database."
    supabase db query --remote -f "$file"
    ;;

  *)
    usage
    ;;
esac
