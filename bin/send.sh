#!/bin/bash

def_host=localhost
def_port=514

HOST=${2:-$def_host}
PORT=${3:-$def_port}

#cat $1 | while read x; do echo "$x" | nc $HOST $PORT; done
cat $1 | nc -4u -w1 $HOST $PORT
