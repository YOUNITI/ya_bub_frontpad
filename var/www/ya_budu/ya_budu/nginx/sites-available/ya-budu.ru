server {
    server_name ябуду.com www.ябуду.com xn--90ag8bb0d.com www.xn--90ag8bb0d.com;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/xn--90ag8bb0d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xn--90ag8bb0d.com/privkey.pem;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    root /var/www/ya_budu/ya_budu/dist;
    index index.html;
    autoindex off;
    
    location / {
        try_files $uri $uri/ @fallback;
    }
    
    location @fallback {
        rewrite ^ /index.html break;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location /uploads {
        proxy_pass http://localhost:3001/uploads;
    }
}
