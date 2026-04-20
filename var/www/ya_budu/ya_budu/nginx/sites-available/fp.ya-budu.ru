server {
    server_name fp.ябуду.com fp.ya-budu.com;
    listen 80;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/xn--90ag8bb0d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xn--90ag8bb0d.com/privkey.pem;
    
    root /var/www/ya_budu/ya_budu/frontpad;
    index index.html;

    # API requests go to backend (port 3005)
    location /api/ {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Serve static files and SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    server_name fp.xn--90ag8bb0d.com;
    listen 80;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/xn--90ag8bb0d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xn--90ag8bb0d.com/privkey.pem;
    
    root /var/www/ya_budu/ya_budu/frontpad;
    index index.html;

    # API requests go to backend (port 3005)
    location /api/ {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Serve static files and SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
