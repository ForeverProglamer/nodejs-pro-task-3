# Docker pre-installation: set up Apt repository
apt-get update -yy
apt-get install -yy ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update -yy

# Docker installation
apt-get -yy install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker post-installation
usermod -aG docker vagrant
newgrp docker

# Github actions runner installation
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.333.1.tar.gz -L https://github.com/actions/runner/releases/download/v2.333.1/actions-runner-linux-x64-2.333.1.tar.gz
tar xzf ./actions-runner-linux-x64-2.333.1.tar.gz
chown -hR vagrant:vagrant actions-runner/

# Configure and run
# ./config.sh --url https://github.com/<owner>/<repo> --token <token>
# nohup ./run.sh &

