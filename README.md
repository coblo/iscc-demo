# ISCC Demo

This app is written in NodeJS. It's running with HTTPS by default. You can add certificates in the config or configure NGINX to forward requests to the app.

## Installation

	npm install

## NGINX Configuration

	location / {
		proxy_pass https://localhost:5555;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection 'upgrade';
		proxy_set_header Host $host;
		proxy_cache_bypass $http_upgrade;
	}