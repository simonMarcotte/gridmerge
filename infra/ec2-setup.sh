#!/bin/bash
set -euxo pipefail

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

# Make sure SSM agent is enabled first
systemctl enable amazon-ssm-agent || true
systemctl restart amazon-ssm-agent || systemctl start amazon-ssm-agent || true

# Install only what you actually need
dnf install -y docker git curl

# Start Docker
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Create app directory
mkdir -p /home/ec2-user/gridmerge
chown -R ec2-user:ec2-user /home/ec2-user/gridmerge

# Diagnostics
systemctl status amazon-ssm-agent --no-pager || true
systemctl status docker --no-pager || true
docker --version || true
/usr/local/lib/docker/cli-plugins/docker-compose version || true