FROM e2b/code-interpreter:latest

# Install Docker Engine
RUN apt-get update && apt-get install -y \
    docker-ce docker-ce-cli containerd.io docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install docker-compose standalone
RUN curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

WORKDIR /root
EXPOSE 8000 8001 8002 8003
CMD ["/bin/bash"]
