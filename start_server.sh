#!/bin/bash -e

cat nginx.conf.tmpl | envsubst '$PWD' >| nginx.conf
nginx -c $PWD/nginx.conf &
NGINX_PID=$!
trap "echo 'kill nginx'; kill -9 $NGINX_PID 2> /dev/null" EXIT

node server.mjs
