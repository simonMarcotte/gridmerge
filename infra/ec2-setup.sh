#!/bin/bash
set -euxo pipefail

# Log user-data output for debugging
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

# Update system
dnf update -y

# Install core packages
dnf install -y docker git curl

# Install and start SSM Agent
dnf install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm || true
systemctl enable amazon-ssm-agent
systemctl restart amazon-ssm-agent

# Install and start Docker
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Make docker compose available in common PATH locations
ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Create app directory
mkdir -p /home/ec2-user/gridmerge
chown -R ec2-user:ec2-user /home/ec2-user/gridmerge

# Helpful diagnostics
systemctl status amazon-ssm-agent --no-pager || true
systemctl status docker --no-pager || true
docker --version || true
/usr/local/lib/docker/cli-plugins/docker-compose version || true