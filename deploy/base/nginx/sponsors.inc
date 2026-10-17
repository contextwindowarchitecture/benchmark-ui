# The sponsors' click-throughs (deploy/README.md, "Sponsor click-throughs"): one location per sponsor in
# src/content/sponsors.ts, a 302 to the sponsor's URL with utm_source added, so each click is a line in the access
# log and the page carries no tracker. Included by benchmark-ui.conf. src/content/sponsors.test.ts renders this
# file's expected text from the list and fails when the two drift: paste what it prints.

location = /go/become-a-sponsor {
    include /opt/app-root/etc/nginx.default.d/headers.inc;
    add_header Cache-Control "no-store" always;
    return 302 "https://github.com/contextwindowarchitecture/benchmark/blob/main/docs/sponsorship-request.md?utm_source=benchmark.contextwindowarchitecture.io";
}
