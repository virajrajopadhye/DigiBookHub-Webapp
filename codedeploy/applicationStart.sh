#!/bin/bash
sudo systemctl restart amazon-cloudwatch-agent.service
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/home/ubuntu/csye6225-webapp/webapp/cloudwatch-config.json \
    -s
cd /home/ubuntu/csye6225-webapp/webapp
pm2 stop server.js
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
npx sequelize db:migrate
pm2 start server.js
pm2 save