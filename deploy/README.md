# Deploying the results site

benchmark.contextwindowarchitecture.io runs on an OpenShift cluster from the image
`quay.io/contextwindowarchitecture/benchmark-ui`, with the benchmark's run directories on a persistent volume. The
design is section 12 of the working plan; this directory holds the pieces.

| Piece | What |
| --- | --- |
| `Containerfile` | A Node stage builds the app; the UBI nginx image serves it on 8080 as any UID with GID 0. Results are never in the image. |
| `base/nginx/` | The server configuration: the app with a single-page fallback, `/results/` from the volume with immutable caching for runs and none for a domain's index, `/config.json`, `/healthz`, compression, security headers. |
| `base/` | Kustomize: the UI Deployment (rolling update, no unavailable replica, probes, restricted security context), Service, Route (edge TLS, HTTP redirected), the results PVC (ReadWriteMany, unless the overlay says otherwise), the `config.json` ConfigMap, the nginx ConfigMap, and the publisher Deployment (scaled to zero, mounts the volume read-write). |
| `overlays/prod/` | The namespace `cwa-benchmark`, the host, the image tag, the replicas, and the results claim's access mode and storage class: the production cluster has one node and one storage class (LVM Storage, ReadWriteOnce only), so the overlay runs one replica on a ReadWriteOnce claim. |
| `publish.sh`, `keep.txt` | Copies run directories into the volume, the domain's index last, and prunes by policy, never the runs `keep.txt` names. |
| `../.github/workflows/image.yml` | Builds and pushes the image, started by hand. |

## Local parity

```sh
podman build -f deploy/Containerfile -t quay.io/contextwindowarchitecture/benchmark-ui:dev .
podman run --rm -p 8080:8080 -v ../benchmark/domain1/results:/data/results:ro,Z quay.io/contextwindowarchitecture/benchmark-ui:dev
```

The same image, the same configuration, with the results directory bind-mounted where the cluster mounts the volume.
`http://localhost:8080/results/d1/index.json` must answer, and the site must render from it.

## First deployment

Prerequisites, outside these manifests: the namespace (`oc new-project cwa-benchmark`), storage for the results
claim (a ReadWriteMany class for more than one replica, or a ReadWriteOnce class and one replica, named in the
overlay's claim patch; a bound claim's access mode and class are immutable, so an empty claim is deleted before they
change), DNS (a CNAME from the host to the cluster's router), a certificate for the host (cert-manager with Let's
Encrypt where the cluster has it, or `tls.certificate` and `tls.key` added to the Route by hand), and the Quay robot
account as the image workflow's secrets. The Quay repository is public, so the cluster needs no pull secret.

```sh
oc apply -k deploy/overlays/prod
oc -n cwa-benchmark rollout status deployment/benchmark-ui
deploy/publish.sh ../benchmark/domain1/results d1 20261008T133453Z-691b414 20261008T073129Z-a1d69f8
```

Until DNS points the host at the router, reach the Route through the router directly:

```sh
curl -sk --resolve benchmark.contextwindowarchitecture.io:443:<router IP> https://benchmark.contextwindowarchitecture.io/healthz
```

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
