# Deployment Guide

This guide covers deployment of the K-12 School Management System to various platforms.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Heroku Deployment](#heroku-deployment)
- [Railway Deployment](#railway-deployment)
- [DigitalOcean/AWS Deployment](#digitalocean-aws-deployment)
- [Database Setup](#database-setup)
- [Production Checklist](#production-checklist)

---

## Prerequisites

- Node.js 14+ installed
- MongoDB 4.4+ installed or MongoDB Atlas account
- Git installed
- Platform-specific CLI tools (optional)

---

## Environment Variables

### Required Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_management
JWT_SECRET=your_secure_jwt_secret_min_32_characters
JWT_EXPIRE=30d
```

### Optional Services

**Email:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=School <noreply@school.com>
```

**SMS (Twilio):**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**File Storage (Cloudinary):**
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd k12-school-management-system
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

5. **Stop services:**
   ```bash
   docker-compose down
   ```

### Using Dockerfile Alone

```bash
# Build image
docker build -t school-management .

# Run container
docker run -d \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://your-mongo-host/school_management \
  -e JWT_SECRET=your_secret \
  --name school-api \
  school-management
```

---

## Heroku Deployment

### Method 1: Using Heroku CLI

1. **Install Heroku CLI:**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku

   # Ubuntu
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

4. **Add MongoDB addon:**
   ```bash
   heroku addons:create mongolab:sandbox
   # OR use MongoDB Atlas and set MONGODB_URI manually
   ```

5. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=$(openssl rand -base64 32)
   heroku config:set JWT_EXPIRE=30d
   # Add other variables as needed
   ```

6. **Deploy:**
   ```bash
   git push heroku main
   ```

7. **Open app:**
   ```bash
   heroku open
   ```

### Method 2: Using Heroku Dashboard

1. Go to [Heroku Dashboard](https://dashboard.heroku.com)
2. Click "New" → "Create new app"
3. Connect to GitHub repository
4. Enable automatic deploys
5. Add MongoDB addon from Resources tab
6. Configure environment variables in Settings

---

## Railway Deployment

1. **Go to [Railway](https://railway.app)**

2. **Create new project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your repository

3. **Add MongoDB:**
   - Click "New"
   - Select "Database" → "MongoDB"
   - Copy the connection string

4. **Configure variables:**
   - Go to your service settings
   - Add environment variables:
     ```
     NODE_ENV=production
     MONGODB_URI=<your-railway-mongodb-uri>
     JWT_SECRET=<generate-secure-secret>
     ```

5. **Deploy:**
   - Railway automatically deploys on push to main branch
   - View logs in Railway dashboard

---

## DigitalOcean/AWS Deployment

### DigitalOcean App Platform

1. **Create App:**
   - Go to DigitalOcean Dashboard
   - Apps → Create App
   - Connect GitHub repository

2. **Configure:**
   ```yaml
   name: school-management
   services:
   - name: api
     github:
       repo: your-username/repo-name
       branch: main
     build_command: npm install
     run_command: npm start
     environment_variables:
       NODE_ENV: production
       MONGODB_URI: ${db.DATABASE_URL}
     instance_count: 1
     instance_size_slug: basic-xxs
   databases:
   - name: mongodb
     engine: MONGODB
     version: "5"
   ```

3. **Add environment variables in App Settings**

4. **Deploy**

### AWS EC2 (Manual Setup)

1. **Launch EC2 instance** (Ubuntu 22.04)

2. **SSH into instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Install dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install MongoDB
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod

   # Install PM2
   sudo npm install -g pm2
   ```

4. **Clone and setup app:**
   ```bash
   git clone <your-repo-url>
   cd k12-school-management-system
   npm install --production
   cp .env.example .env
   nano .env  # Configure variables
   ```

5. **Start with PM2:**
   ```bash
   pm2 start server.js --name school-api
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx reverse proxy:**
   ```bash
   sudo apt install nginx

   # Create Nginx config
   sudo nano /etc/nginx/sites-available/school
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/school /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create account** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Create cluster:**
   - Free tier (M0) available
   - Choose region closest to your users

3. **Create database user:**
   - Database Access → Add New User
   - Choose authentication method
   - Save credentials

4. **Whitelist IP addresses:**
   - Network Access → Add IP Address
   - For development: 0.0.0.0/0 (anywhere)
   - For production: Your server's IP

5. **Get connection string:**
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your password
   - Use this as MONGODB_URI

---

## Production Checklist

### Security

- [ ] Change default JWT_SECRET to strong random string
- [ ] Use environment variables for all sensitive data
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Implement CORS properly
- [ ] Use Helmet.js for security headers
- [ ] Regular security audits (`npm audit`)

### Performance

- [ ] Enable compression
- [ ] Set up Redis for caching (optional)
- [ ] Configure database indexes
- [ ] Enable gzip compression in Nginx
- [ ] Set up CDN for static assets
- [ ] Implement API response caching

### Monitoring

- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Configure uptime monitoring
- [ ] Set up performance monitoring
- [ ] Enable application logging
- [ ] Configure database backups
- [ ] Set up alerts for critical errors

### Backup

- [ ] Automated database backups
- [ ] File storage backups (if using local storage)
- [ ] Backup retention policy
- [ ] Test restore procedures

### Documentation

- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document environment variables
- [ ] API documentation updated
- [ ] User documentation available

---

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Restart application
pm2 restart school-api

# OR with Docker
docker-compose pull
docker-compose up -d
```

### Database Backup

```bash
# Manual backup
mongodump --uri="mongodb://your-uri" --out=/path/to/backup

# Restore
mongorestore --uri="mongodb://your-uri" /path/to/backup
```

### View Logs

```bash
# PM2
pm2 logs school-api

# Docker
docker-compose logs -f api

# Heroku
heroku logs --tail

# Railway
railway logs
```

---

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to MongoDB
- Check MONGODB_URI is correct
- Verify database is running
- Check firewall rules
- Verify network access in Atlas

**Problem:** API not responding
- Check if application is running
- Verify PORT is correct
- Check firewall/security groups
- Review application logs

### Performance Issues

- Enable caching
- Optimize database queries
- Add database indexes
- Scale horizontally (add instances)
- Use CDN for static assets

---

## Support

For deployment issues:
1. Check application logs
2. Review this documentation
3. Check platform-specific documentation
4. Open an issue on GitHub

---

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Docker Documentation](https://docs.docker.com/)
- [Railway Documentation](https://docs.railway.app/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
