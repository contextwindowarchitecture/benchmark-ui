# Deploying the results site

benchmark.contextwindowarchitecture.io runs on an OpenShift cluster from the image
`quay.io/contextwindowarchitecture/benchmark-ui`, with the benchmark's run directories on a persistent volume. The
design is section 12 of the working plan; this directory holds the pieces.

| Piece | What |
| --- | --- |
| `Containerfile` | A Node stage builds the app; the UBI nginx image serves it on 8080 as any UID with GID 0. Results are never in the image. |
| `base/nginx/` | The server configuration: the app with a single-page fallback, `/results/` from the volume with immutable caching for runs and none for a domain's index, `/config.json`, `/healthz`, compression, security headers, and the sponsors' `/go/<slug>` redirects (`sponsors.inc`, below). |
| `base/` | Kustomize: the UI Deployment (rolling update, no unavailable replica, probes, restricted security context), Service, Route (edge TLS, HTTP redirected), the results PVC (ReadWriteMany, unless the overlay says otherwise), the `config.json` ConfigMap, the nginx ConfigMap, and the publisher Deployment (scaled to zero, mounts the volume read-write). |
| `overlays/prod/` | The namespace `cwa-benchmark`, the host, the image tag, the replicas, and the results claim's access mode and storage class: the production cluster has one node and one storage class (LVM Storage, ReadWriteOnce only), so the overlay runs one replica on a ReadWriteOnce claim. |
| `overlays/prod/issuer.yaml`, `certificate.yaml`, `router-secret-reader.yaml` | Let's Encrypt through the cluster's cert-manager: the ACME issuer, the host's certificate into the secret `benchmark-ui-tls`, and the router's read access to that secret, which the Route names. |
| `publish.sh`, `keep.txt` | Copies run directories into the volume, the domain's index last, and prunes by policy, never the runs `keep.txt` names. |
| `../.github/workflows/image.yml` | Builds and pushes the image, started by hand. |

## Local parity

```sh
podman build -f deploy/Containerfile -t quay.io/contextwindowarchitecture/benchmark-ui:dev .
podman run --rm -p 8080:8080 -v ../benchmark/domain1/results:/data/results:ro,Z quay.io/contextwindowarchitecture/benchmark-ui:dev
```

The same image, the same configuration, with the results directory bind-mounted where the cluster mounts the volume.
`http://localhost:8080/results/d1/index.json` must answer, and the site must render from it. The mount holds one
directory per domain (`d1`, `d2`, `d5`); to see Domains 2 and 5 locally, mount a directory that holds them all.

The smoke test and the performance budgets run against the container as they do against `vite preview`: mount the
fixture runs for the smoke test and the real results for the budgets, and point Playwright at the container.

```sh
podman run -d --name bui-fixtures -p 8081:8080 \
  -v "$PWD/vendor/cwa-bench/domain1/fixtures/runs:/data/results/d1:ro,Z" \
  -v "$PWD/vendor/cwa-bench/domain2/fixtures/runs:/data/results/d2:ro,Z" \
  -v "$PWD/vendor/cwa-bench/domain5/fixtures/runs:/data/results/d5:ro,Z" \
  quay.io/contextwindowarchitecture/benchmark-ui:dev
PLAYWRIGHT_BASE_URL=http://localhost:8081 pnpm test:e2e
podman run -d --name bui-real -p 8082:8080 \
  -v "$(cd ../benchmark/domain1/results/d1 && pwd):/data/results/d1:ro,Z" \
  -v "$(cd ../benchmark/domain2/results/d2 && pwd):/data/results/d2:ro,Z" \
  -v "$(cd ../benchmark/domain5/results/d5 && pwd):/data/results/d5:ro,Z" \
  quay.io/contextwindowarchitecture/benchmark-ui:dev
PLAYWRIGHT_BASE_URL=http://localhost:8082 pnpm test:perf
podman rm -f bui-fixtures bui-real
```

## First deployment

Prerequisites, outside these manifests: the namespace (`oc new-project cwa-benchmark`), storage for the results
claim (a ReadWriteMany class for more than one replica, or a ReadWriteOnce class and one replica, named in the
overlay's claim patch; a bound claim's access mode and class are immutable, so an empty claim is deleted before they
change), DNS (a CNAME from the host to the cluster's router, below), cert-manager on the cluster (the certificate
itself is in the overlay, below), and the Quay robot account as the image workflow's secrets. The Quay repository is
public, so the cluster needs no pull secret.

```sh
oc apply -k deploy/overlays/prod          # the Route is refused until its certificate exists: see DNS and TLS
oc -n cwa-benchmark rollout status deployment/benchmark-ui
deploy/publish.sh ../benchmark/domain1/results d1 20261012T084246Z-c5ce648 20261012T154357Z-a6bbb5b
```

Until DNS propagates, reach the Route through the router directly:

```sh
curl -sk --resolve benchmark.contextwindowarchitecture.io:443:<router IP> https://benchmark.contextwindowarchitecture.io/healthz
```

## DNS and TLS

DNS is a CNAME from the host to a name under the router's wildcard domain (`benchmark.apps.dev.mrhillsman.com`), so
the record follows the router if its address changes.

The certificate comes from Let's Encrypt through the cluster's cert-manager: `issuer.yaml` (ACME with the HTTP-01
challenge through an Ingress of the router's class, which OpenShift turns into a Route for the challenge path, so the
host must resolve to the router first), `certificate.yaml` (the host's certificate, renewed into the secret
`benchmark-ui-tls`) and `router-secret-reader.yaml` (the router's service account may read that secret). The Route
names the secret in `spec.tls.externalCertificate` and carries no certificate of its own, so a renewal touches
nothing but the secret.

The API refuses a Route that names a secret which does not exist yet, so the first apply creates the issuer, the
certificate and the role and leaves the Route as it was; the second, once the certificate is ready, moves the Route
onto it and clears any certificate that was set on the Route by hand:

```sh
oc apply -k deploy/overlays/prod          # issuer, certificate, role; the Route is refused for now
oc -n cwa-benchmark wait certificate/benchmark-ui-tls --for=condition=Ready --timeout=10m
oc apply -k deploy/overlays/prod          # the Route takes the certificate
curl -sI https://benchmark.contextwindowarchitecture.io/healthz
```

If the certificate does not become ready, `oc -n cwa-benchmark describe challenge` says what Let's Encrypt saw.

## Rolling out a new image

Set `newTag` in `deploy/overlays/prod/kustomization.yaml` to the new image's tag, by hand rather than with
`kustomize edit set image`, which rewrites the file and drops its comments. Then:

```sh
oc apply -k deploy/overlays/prod
oc -n cwa-benchmark rollout status deployment/benchmark-ui
oc -n cwa-benchmark rollout undo deployment/benchmark-ui     # if it must go back
```

The tag is the 12-character SHA of the commit the image was built from, as the image workflow prints it. Commit the
overlay change: the tag in git is what runs.

## Publishing results

A run is published whole, blobs included, by `publish.sh`; the domain's `index.json` is copied last, so the site
never lists a run that is not yet there. A fresh volume is formatted at its first mount, so publishing can go first,
before the UI's first rollout has completed. `KEEP=20 deploy/publish.sh …` prunes run directories beyond the newest
twenty, except those in `keep.txt`. The site shows a pruned run as "pruned", since the index still lists it. Nothing
runs the harness in the cluster.

A run is copied in batches of about 64 MB (`PIECE_MB`), each a tar stream through `oc exec` retried up to three times
(`RETRIES`), and its own `index.json` after the rest of it: a dropped connection to the API server costs one batch, not
the run (a recorded Domain 2 run is 1.1 GB in 20,000 files). Each attempt finds the publisher's running pod again,
scaling it back up if it is gone, so a replaced pod costs one attempt. If a batch fails every attempt the script stops,
copies no index, and can simply be run again.

One publish runs at a time. Every run shares the one publisher and scales it down when it ends, so a second run started
before the first ended had its pod scaled away mid-copy. The script now holds the ConfigMap `results-publish-lock`
while it runs and refuses to start while another holds it, naming the holder. A lock left by a run that was killed
stays until removed, once that run is surely gone: `oc -n cwa-benchmark delete configmap results-publish-lock`.

The claim's storage class reclaims with `Delete`: deleting the `benchmark-results` claim deletes its volume and every
run on it, and the next `oc apply` creates an empty one. After that, publish the runs `keep.txt` names again, each
domain on its own.

Each domain is published on its own, with its own results root and index; the site reads `results/d1/`,
`results/d2/` and `results/d5/`. Domains 2 and 5's reported runs are made on the GPU host, so copy the run
directories and `index.json` from its `domain2/results/d2/` or `domain5/results/d5/` to a local directory first, then
publish every run its index lists that the site should show (an index names runs the volume may not hold, and those
show as pruned):

```sh
deploy/publish.sh <local copy of domain2/results> d2 20261012T052348Z-4a0ea5d 20261012T042632Z-4a0ea5d
deploy/publish.sh <local copy of domain5/results> d5 20261013T224806Z-5fc59ba
```

The Domain 2 and Domain 5 overviews and question pages read each suite from the newest finished run outside a CI
profile at the recorded size that has it, then the newest outside a profile, and a CI profile's run only for a suite
no such run has. The size is each run's `size` in the runs index, so a pilot made after the recorded run never takes
a panel, but only from an index the harness wrote since it gained the field: rebuild an older index before
publishing it, with the harness's own command, which fills the field from each run's manifest or, for an older run,
its own record of it:

```sh
cd ../benchmark/domain2 && uv run cwabench --domain 2 index
cd ../benchmark/domain5 && uv run cwabench --domain 5 index
```

So the recorded run, and the S6 run Domain 2's write-up reports beside it, must be on the volume for the overview to
show the write-up's results, and the S6 run must be older than the recorded run, so the overview takes only S6 from
it. The overview reads past a run the volume no longer holds, saying which run stands in for it; still, when a
reported run is left off the volume on purpose, rebuild the index over the local copy that holds only the runs to
publish, with the harness's own writer (the command reads its results directory from the configuration, so call it
directly), and publish that index, so the site lists what it holds:

```sh
cd ../benchmark/domain5 && uv run python -c "from pathlib import Path; from cwabench.rundir import rebuild_runs_index; \
  from cwabench5 import output; rebuild_runs_index(Path('<local copy of domain5/results>/d5'), output.D5)"
```

Add the runs the write-up cites to `keep.txt`.

## Sponsor click-throughs

A sponsor's logo on the site, and the link in its card's dialog on the Sponsors page, go to `/go/<slug>`, not to the
sponsor. nginx answers it with a 302 to the sponsor's
URL with `utm_source=benchmark.contextwindowarchitecture.io` added, marked `no-store` so every click reaches the
server, and the access log line is the count: the page carries no analytics and no tracker, and the policy in
`headers.inc` still allows no third-party origin. The locations are in `deploy/base/nginx/sponsors.inc`, one per
sponsor in `src/content/sponsors.ts`; `src/content/sponsors.test.ts` renders that file's expected text from the list
and fails when the two drift, printing the text to paste. A slug that is not listed falls through to the app, which
shows its not-found page, so an unknown `/go/` path is a 200 in the log and is never counted.

Adding a sponsor is one commit: the entry and its two logos in the UI, and the location here. The logos are in the
image, so it is a new image and a rollout as above; the nginx ConfigMap is generated from `base/nginx/`, so the
apply rolls the pods onto the new file as well. Locally, `curl -sI http://localhost:8080/go/<slug>` against the
container shows the 302 and its `Location`.

The count comes from the UI pods' access log, which the UBI image writes to the pod's standard output in nginx's
`main` format (the request's path is the seventh field, the status the ninth):

```sh
oc -n cwa-benchmark logs deployment/benchmark-ui --since=168h \
  | awk '$7 ~ "^/go/" && $9 == 302 { print $7 }' | sort | uniq -c | sort -rn
```

That log is the only record. It starts over when the pod is replaced (a rollout, a restart) and `oc logs` returns
what the node still holds, so the count is a window, not a total, unless the logs are collected: the cluster's
logging stack, or a periodic dump of the command above into a file the maintainer keeps.
