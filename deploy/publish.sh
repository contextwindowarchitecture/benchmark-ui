#!/usr/bin/env bash
# Publish runs into the results volume (benchmark-ui's plan, 12.2): scale the publisher up, copy each run directory
# first and the domain's index.json last, so the index never names a run that is not yet whole, then scale it down.
#
#   deploy/publish.sh <results root> <domain> <run-id>...
#   deploy/publish.sh ../benchmark/domain1/results d1 20261008T133453Z-691b414 20261008T073129Z-a1d69f8
#
# NAMESPACE (default cwa-benchmark) and KEEP are read from the environment. With KEEP=N, run directories beyond the
# newest N under the domain are removed after publishing, except those listed in deploy/keep.txt. The copy uses
# oc rsync's tar strategy, so the publisher image needs tar and nothing else. Needs oc logged in to the cluster.
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
here=$(cd "$(dirname "$0")" && pwd)

[ -f "$root/$domain/index.json" ] || { echo "no $root/$domain/index.json" >&2; exit 2; }
for run in "$@"; do
  [ -d "$root/$domain/$run" ] || { echo "no run $run under $root/$domain" >&2; exit 2; }
done

oc -n "$ns" scale deployment/results-publisher --replicas=1
oc -n "$ns" rollout status deployment/results-publisher --timeout=180s
pod=$(oc -n "$ns" get pod -l app.kubernetes.io/name=results-publisher --field-selector=status.phase=Running \
      -o jsonpath='{.items[0].metadata.name}')
trap 'oc -n "$ns" scale deployment/results-publisher --replicas=0' EXIT

oc -n "$ns" rsh "$pod" mkdir -p "/data/results/$domain"
for run in "$@"; do
  echo "publishing $domain/$run"
  oc -n "$ns" rsync --strategy=tar "$root/$domain/$run" "$pod:/data/results/$domain/"
done
oc -n "$ns" cp "$root/$domain/index.json" "$pod:/data/results/$domain/index.json"

if [ -n "$keep" ]; then
  anchors=$(grep -v '^#' "$here/keep.txt" 2>/dev/null | tr '\n' ' ' || true)
  # Run ids sort by time, so the newest N are the last N names; keep.txt's runs are skipped.
  oc -n "$ns" rsh "$pod" sh -c "cd /data/results/$domain && ls -d 2*/ 2>/dev/null | tr -d / | sort -r \
    | tail -n +$((keep + 1)) | while read -r r; do case \" $anchors \" in *\" \$r \"*) ;; \
    *) echo \"pruning \$r\"; rm -rf \"\$r\";; esac; done"
fi
echo "published under $domain: $(oc -n "$ns" rsh "$pod" ls "/data/results/$domain" | tr '\n' ' ')"
