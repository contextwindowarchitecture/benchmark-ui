#!/usr/bin/env bash
# Publish runs into the results volume (benchmark-ui's plan, 12.2): scale the publisher up, copy each run directory
# first and the domain's index.json last, so the index never names a run that is not yet whole, then scale it down.
#
#   deploy/publish.sh <results root> <domain> <run-id>...
#   deploy/publish.sh ../benchmark/domain1/results d1 20261012T084246Z-c5ce648 20261012T090317Z-c5ce648
#   deploy/publish.sh <local copy of domain2/results> d2 20261012T052348Z-4a0ea5d 20261012T042632Z-4a0ea5d
#
# NAMESPACE (default cwa-benchmark) and KEEP are read from the environment. With KEEP=N, run directories beyond the
# newest N under the domain are removed after publishing, except those listed in deploy/keep.txt. Needs oc logged in
# to the cluster, and tar here and in the publisher image.
#
# A run is copied in batches of about PIECE_MB (default 64) megabytes, each a tar stream piped into the publisher
# through oc exec and retried up to RETRIES (default 3) times: one stream for a whole run (a recorded Domain 2 run
# is 1.1 GB in 20,000 files) loses everything when the connection to the API server drops, and it did. A run's own
# index.json goes last, after every other file of it, so a run the index names is whole; re-running the script
# after a failure copies everything again over what is there.
set -euo pipefail
if [ $# -lt 3 ]; then
  echo "usage: $0 <results root> <domain> <run-id>..." >&2
  exit 2
fi
root=$1
domain=$2
shift 2
ns=${NAMESPACE:-cwa-benchmark}
keep=${KEEP:-}
piece_bytes=$(( ${PIECE_MB:-64} * 1024 * 1024 ))
retries=${RETRIES:-3}
here=$(cd "$(dirname "$0")" && pwd)

[ -f "$root/$domain/index.json" ] || { echo "no $root/$domain/index.json" >&2; exit 2; }
for run in "$@"; do
  [ -d "$root/$domain/$run" ] || { echo "no run $run under $root/$domain" >&2; exit 2; }
done

oc -n "$ns" scale deployment/results-publisher --replicas=1
oc -n "$ns" rollout status deployment/results-publisher --timeout=180s
pod=$(oc -n "$ns" get pod -l app.kubernetes.io/name=results-publisher --field-selector=status.phase=Running \
      -o jsonpath='{.items[0].metadata.name}')
work=$(mktemp -d)
trap 'rm -rf "$work"; oc -n "$ns" scale deployment/results-publisher --replicas=0' EXIT

# File sizes and names, one per line, with BSD's stat or GNU's.
if stat --version >/dev/null 2>&1; then stat_args=(-c '%s %n'); else stat_args=(-f '%z %N'); fi

# Sends the files a list names, relative to $root/$domain, into the volume as one tar stream, retrying.
send() {
  local list=$1 attempt
  for attempt in $(seq 1 "$retries"); do
    if COPYFILE_DISABLE=1 tar -C "$root/$domain" --format=ustar --no-xattrs -cf - -T "$list" \
      | oc -n "$ns" exec -i "$pod" -- tar -C "/data/results/$domain" -xf -; then
      return 0
    fi
    echo "  attempt $attempt of $retries failed" >&2
    sleep 5
  done
  echo "  gave up after $retries attempts; re-run the script to publish again" >&2
  return 1
}

# One run: every file but its index.json in batches of about piece_bytes, then its index.json.
copy_run() {
  local run=$1 batch count i=0
  rm -f "$work"/batch.*
  (cd "$root/$domain" && find "$run" -type f ! -path "$run/index.json" -exec stat "${stat_args[@]}" {} + \
    | sort -k2) \
    | awk -v limit="$piece_bytes" -v dir="$work" '{
        size = $1; name = $0; sub(/^[0-9]+ /, "", name)
        if (total > 0 && total + size > limit) { n++; total = 0 }
        total += size; print name > sprintf("%s/batch.%05d", dir, n)
      }'
  count=$(find "$work" -name 'batch.*' | wc -l | tr -d ' ')
  for batch in "$work"/batch.*; do
    [ -e "$batch" ] || continue
    i=$((i + 1))
    echo "  batch $i of $count ($(wc -l <"$batch" | tr -d ' ') files)"
    send "$batch"
  done
  echo "$run/index.json" >"$work/run-index"
  send "$work/run-index"
}

oc -n "$ns" rsh "$pod" mkdir -p "/data/results/$domain"
for run in "$@"; do
  echo "publishing $domain/$run"
  copy_run "$run"
done
echo "index.json" >"$work/domain-index"
send "$work/domain-index"

if [ -n "$keep" ]; then
  anchors=$(grep -v '^#' "$here/keep.txt" 2>/dev/null | tr '\n' ' ' || true)
  # Run ids sort by time, so the newest N are the last N names; keep.txt's runs are skipped.
  oc -n "$ns" rsh "$pod" sh -c "cd /data/results/$domain && ls -d 2*/ 2>/dev/null | tr -d / | sort -r \
    | tail -n +$((keep + 1)) | while read -r r; do case \" $anchors \" in *\" \$r \"*) ;; \
    *) echo \"pruning \$r\"; rm -rf \"\$r\";; esac; done"
fi
echo "published under $domain: $(oc -n "$ns" rsh "$pod" ls "/data/results/$domain" | tr '\n' ' ')"
