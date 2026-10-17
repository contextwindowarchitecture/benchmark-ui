# The sponsors' click-throughs (deploy/README.md, "Sponsor click-throughs"): one location per sponsor in
# src/content/sponsors.ts, a 302 to the sponsor's URL with utm_source added, so each click is a line in the access
# log and the page carries no tracker. Included by benchmark-ui.conf. src/content/sponsors.test.ts renders this
# file's expected text from the list and fails when the two drift: paste what it prints.
