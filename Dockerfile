FROM nginx:alpine

LABEL org.opencontainers.image.revision=$GITHUB_SHA

COPY index.html /usr/share/nginx/html/index.html
COPY images/ /usr/share/nginx/html/images/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD wget -qO- http://localhost || exit 1