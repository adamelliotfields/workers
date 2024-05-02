FROM mcr.microsoft.com/devcontainers/typescript-node:20

# add bun bin to path
ENV PATH "/home/node/.bun/bin:${PATH}"

# set node user/group
USER 1000:1000

# workdir
WORKDIR /workspaces/workers

# install bun
RUN curl -fsSL https://bun.sh/install | bash
