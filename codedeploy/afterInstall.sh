#!/bin/bash
cd /home/ubuntu/csye6225-webapp/webapp
cd ..
sudo chown -R ubuntu:ubuntu webapp
cd webapp
sudo rm -rf node_modules
npm install
