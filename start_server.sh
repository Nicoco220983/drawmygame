#!/bin/bash -e

if [ "$DRAWMYGAME_ENV" = "production" ]; then
    export NGINX_PORT=80
    export DRAWMYGAME_PORT=8080
else
    export NGINX_PORT=3000
    export DRAWMYGAME_PORT=3001
fi

cat nginx.conf.tmpl | envsubst '$PWD $NGINX_PORT $DRAWMYGAME_PORT' >| nginx.conf
nginx -c $PWD/nginx.conf &
NGINX_PID=$!
trap "echo 'kill nginx'; kill -9 $NGINX_PID 2> /dev/null" EXIT

node server.mjs
