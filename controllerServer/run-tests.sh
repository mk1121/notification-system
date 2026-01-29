#!/bin/bash

# Run Jest tests and save output
cd /media/oem/data/nodejs/notification/controllerServer
./node_modules/.bin/jest --coverage --verbose > /tmp/test-output.log 2>&1
echo "Exit code: $?" >> /tmp/test-output.log
