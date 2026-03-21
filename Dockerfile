# Usa una imagen ligera de nginx
FROM nginx:alpine

# Copia el archivo HTML al directorio servido por nginx
COPY index.html /usr/share/nginx/html/index.html

# Expone el puerto 80 (por defecto nginx)
EXPOSE 80