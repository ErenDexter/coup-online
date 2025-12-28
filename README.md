# Shorojontro - Coup Card Game Online

A real-time multiplayer implementation of the Coup card game built with modern web technologies.

## Tech Stack

- **Frontend**: SvelteKit 5
- **Styling**: Tailwind CSS 4
- **Real-time**: Socket.io
- **Database**: SQLite with Drizzle ORM
- **Runtime**: Node.js with Express

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Initialize the database
pnpm db:push

# Start development server
pnpm dev
```

### Production

```bash
# Build the app
pnpm build

# Start production server
pnpm start
```

### Environment Variables

Create a `.env` file (optional):

```env
PORT=3000
DATABASE_URL=./coup.db
```

## Game Rules (Coup)

Coup is a game of bluffing and deduction. Each player starts with:

- 2 influence cards (face-down)
- 2 coins

### Win Condition

Be the last player with influence cards remaining.

### Actions

| Action      | Cost    | Effect                                                          | Card Required |
| ----------- | ------- | --------------------------------------------------------------- | ------------- |
| Income      | Free    | Gain 1 coin                                                     | None          |
| Foreign Aid | Free    | Gain 2 coins (can be blocked by Duke)                           | None          |
| Coup        | 7 coins | Target loses 1 influence                                        | None          |
| Tax         | Free    | Gain 3 coins                                                    | Duke          |
| Assassinate | 3 coins | Target loses 1 influence (can be blocked by Contessa)           | Assassin      |
| Steal       | Free    | Take 2 coins from target (can be blocked by Captain/Ambassador) | Captain       |
| Exchange    | Free    | Draw 2 cards, return 2 to deck                                  | Ambassador    |

### Challenging

Any action that claims a card can be challenged. If:

- **Challenge succeeds**: The actor loses 1 influence
- **Challenge fails**: The challenger loses 1 influence, actor shuffles revealed card back and draws new

### Cards

- **Duke**: Tax, Block Foreign Aid
- **Assassin**: Assassinate
- **Captain**: Steal, Block Steal
- **Ambassador**: Exchange, Block Steal
- **Contessa**: Block Assassination

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/          # Drizzle ORM schema & connection
│   │   ├── game/        # Coup game logic
│   │   └── socket/      # Socket.io game server
│   ├── types.ts         # Shared TypeScript types
│   └── assets/          # Static assets
├── routes/
│   ├── +page.svelte     # Home/lobby page
│   ├── +layout.svelte   # Root layout
│   ├── layout.css       # Global styles
│   └── room/
│       └── [code]/      # Game room page
│           └── +page.svelte
server.js                # Production server entry
```

## Scripts

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start development server        |
| `pnpm build`     | Build for production            |
| `pnpm start`     | Run production server           |
| `pnpm check`     | Type-check the codebase         |
| `pnpm db:push`   | Push schema changes to database |
| `pnpm db:studio` | Open Drizzle Studio             |

## Deployment on Digital Ocean

### Option 1: App Platform (Recommended)

1. **Push your code to GitHub/GitLab**

2. **Create a new App on Digital Ocean App Platform**
   - Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your repository

3. **Configure the App**

   ```yaml
   # App Spec
   name: shorojontro
   region: nyc
   services:
     - name: web
       source:
         repo: your-username/shorojontro
         branch: main
       build_command: pnpm install && pnpm build && pnpm db:push
       run_command: pnpm start
       envs:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: '3000'
       http_port: 3000
       instance_count: 1
       instance_size_slug: basic-xxs
       routes:
         - path: /
   ```

4. **Deploy**
   - Click "Create Resources"
   - Wait for the build and deployment to complete

### Option 2: Droplet (Manual Setup)

1. **Create a Droplet**
   - Choose Ubuntu 22.04 LTS
   - Select at least 1GB RAM (Basic plan works)
   - Add your SSH key

2. **SSH into your Droplet**

   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install Node.js and pnpm**

   ```bash
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install pnpm
   npm install -g pnpm
   ```

4. **Clone and setup the project**

   ```bash
   cd /var/www
   git clone https://github.com/your-username/shorojontro.git
   cd shorojontro

   # Install dependencies
   pnpm install

   # Build the app
   pnpm build

   # Initialize database
   pnpm db:push
   ```

5. **Setup PM2 for process management**

   ```bash
   npm install -g pm2

   # Start the app
   pm2 start server.js --name shorojontro

   # Enable startup on reboot
   pm2 startup
   pm2 save
   ```

6. **Configure Nginx as reverse proxy**

   ```bash
   sudo apt install nginx -y

   # Create Nginx config
   sudo nano /etc/nginx/sites-available/shorojontro
   ```

   Add the following configuration:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable the site:

   ```bash
   sudo ln -s /etc/nginx/sites-available/shorojontro /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Setup SSL with Certbot (optional but recommended)**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

### Environment Variables for Production

| Variable       | Description             | Default       |
| -------------- | ----------------------- | ------------- |
| `PORT`         | Server port             | `3000`        |
| `NODE_ENV`     | Environment mode        | `development` |
| `DATABASE_URL` | SQLite database path    | `./coup.db`   |
| `ORIGIN`       | Allowed origin for CORS | (auto)        |

### Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable
```

## License

MIT
