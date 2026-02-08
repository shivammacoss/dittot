# dittot VPS Deployment Guide (Fresh OS Installation)

## Step 1: First Login to VPS

SSH into your VPS as root:
```bash
ssh root@YOUR_VPS_IP
```

## Step 2: Create a New User (Recommended for Security)

```bash
# Create new user
adduser dittot

# Add user to sudo group
usermod -aG sudo dittot

# Switch to new user
su - dittot
```

## Step 3: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 4: Install Node.js 20 LTS

```bash
# Install curl if not present
sudo apt install curl -y

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install nodejs -y

# Verify installation
node --version
npm --version
```

## Step 5: Install MongoDB

### For Ubuntu 24.04 Noble (MongoDB 8.0)
```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Update and install
sudo apt update
sudo apt install mongodb-org -y

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### For Ubuntu 22.04 Jammy (MongoDB 7.0)
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install mongodb-org -y
sudo systemctl start mongod && sudo systemctl enable mongod
```

## Step 6: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 7: Install Git

```bash
sudo apt install git -y
```

## Step 8: Upload Project to VPS

### Option A: Using Git (Recommended)
```bash
cd /home/dittot
git clone YOUR_REPO_URL setup
```

### Option B: Using SCP (from your local machine)
```bash
# Run this on your LOCAL machine, not VPS
scp -r ./setup dittot@YOUR_VPS_IP:/home/dittot/
```

### Option C: Using SFTP/FileZilla
- Connect to VPS using FileZilla
- Upload the `setup` folder to `/home/dittot/`

## Step 9: Configure Backend

```bash
cd /home/dittot/setup/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env
```

Edit `.env` with your production values:
```env
PORT=5001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/dittot
JWT_SECRET=your_secure_random_string_here
CORS_ORIGIN=http://YOUR_VPS_IP:5173
```

## Step 10: Configure Frontend

```bash
cd /home/dittot/setup/frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env
```

Edit `.env` with your VPS IP:
```env
VITE_API_URL=http://YOUR_VPS_IP:5001
```

## Step 11: Build Frontend

```bash
cd /home/dittot/setup/frontend
npm run build
```

## Step 12: Start Backend with PM2

```bash
cd /home/dittot/setup/backend

# Start with PM2
pm2 start server.js --name dittot-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 13: Serve Frontend

### Option A: Using serve (Simple)
```bash
npm install -g serve
cd /home/dittot/setup/frontend
pm2 start "serve -s dist -l 5173" --name dittot-frontend
```

### Option B: Using Nginx (Recommended for Production)
```bash
sudo apt install nginx

# Configure nginx
sudo nano /etc/nginx/sites-available/dittot
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;
    
    # Frontend
    location / {
        root /home/dittot/setup/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket for real-time prices
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dittot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Configure Firewall

```bash
# Allow required ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (if using SSL)
sudo ufw allow 5001  # Backend API (if not using nginx proxy)
sudo ufw allow 5173  # Frontend (if not using nginx)
sudo ufw enable
```

## Step 8: Access Your Application

- Frontend: `http://YOUR_VPS_IP` (with nginx) or `http://YOUR_VPS_IP:5173`
- Backend API: `http://YOUR_VPS_IP:5001/api`

## Useful PM2 Commands

```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart all apps
pm2 stop dittot-backend   # Stop backend
pm2 delete dittot-backend # Remove from PM2
```

## Troubleshooting

### Backend not connecting to MongoDB
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Frontend can't reach backend
1. Check CORS settings in backend
2. Verify firewall allows port 5001
3. Check VITE_API_URL in frontend .env

### View logs
```bash
pm2 logs dittot-backend --lines 100
```

## Adding Domain Later

When you add a domain:

1. Update DNS A record to point to VPS IP
2. Update frontend `.env`:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```
3. Update backend CORS:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```
4. Rebuild frontend: `npm run build`
5. Configure SSL with Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```
