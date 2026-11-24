#!/bin/sh
set -eu

# This per-certificate hook must not run for another site's renewal.
[ "${RENEWED_LINEAGE:-}" = '/etc/letsencrypt/live/h7septima.ru' ] || exit 0

/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
