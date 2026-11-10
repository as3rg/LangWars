#!/bin/sh
set -eu
set -f

# Render only proxy trust to tmpfs; the image filesystem stays read-only.
# With no override, the local/Caddy configurations continue to use their existing file.
if [ "${1:-}" = nginx ] && [ -n "${TRUSTED_PROXY_CIDRS:-}" ]; then
    trust=/tmp/langwars-proxy-trust.conf
    : > "$trust"
    for address in $TRUSTED_PROXY_CIDRS; do
        case "$address" in
            *[!0-9a-fA-F:./]*|'')
                echo 'TRUSTED_PROXY_CIDRS must contain space-separated IP addresses or CIDRs' >&2
                exit 1
                ;;
        esac
        case "$address" in
            *:*) ;;
            *[!0-9./]*) echo 'Proxy hostnames are not accepted; use an exact IP or CIDR' >&2; exit 1 ;;
        esac
        printf 'set_real_ip_from %s;\n' "$address" >> "$trust"
    done
    printf 'real_ip_header X-Forwarded-For;\nreal_ip_recursive on;\n' >> "$trust"
    sed 's@include /etc/nginx/proxy-trust.conf;@include /tmp/langwars-proxy-trust.conf;@' \
        /etc/nginx/nginx.conf > /tmp/langwars-nginx.conf
    set -- "$@" -c /tmp/langwars-nginx.conf
fi

exec "$@"
