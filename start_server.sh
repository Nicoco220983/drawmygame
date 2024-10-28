#!/bin/bash -e

if [ "$DRAWMYGAME_ENV" = "production" ]; then
    export NGINX_PORT="443 ssl"
    export DRAWMYGAME_PORT=8080
else
    export NGINX_PORT="8443 ssl"
    export DRAWMYGAME_PORT=8080
    export SSL_CERT="$PWD/dev_cert.pem"
    export SSL_CERT_KEY="$PWD/dev_key.pem"
fi

cat nginx.conf.tmpl | envsubst '$PWD $NGINX_PORT $DRAWMYGAME_PORT $SSL_CERT $SSL_CERT_KEY' >| nginx.conf
nginx -c $PWD/nginx.conf &
NGINX_PID=$!
trap "echo 'kill nginx'; kill -9 $NGINX_PID 2> /dev/null" EXIT

node server.mjs
