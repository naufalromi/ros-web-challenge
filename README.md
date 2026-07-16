# ROS Web Teleoperation

Web-based teleoperation system for Turtlebot3 Waffle simulation using ROS Noetic, Gazebo 11, and a hybrid cloud-edge architecture.

## Architecture

```
Browser  <-->  Azure VM (server.js + MySQL)  <-->  Laptop (listener.py + Docker)
                                                           |
                                                     Gazebo + ROS
```

- **Azure VM**: Express.js server, MySQL database, web cloudflared tunnel (HTTPS)
- **Laptop**: Docker container (Gazebo, rosbridge, web_video_server), listener.py, 2 cloudflared tunnels (rosbridge + camera)

## Tech Stack

- ROS Noetic, Gazebo 11, rosbridge_server, web_video_server
- Node.js (Express), MySQL
- Python 3 (listener)
- Docker, Cloudflared tunnels
- Frontend: HTML5, Tailwind CSS, roslibjs

## Features

- Real-time robot teleoperation via browser (WebSocket to rosbridge)
- Live camera stream from Gazebo simulation (MJPEG via web_video_server)
- ON/OFF robot control (start/stop Gazebo, rosbridge, web_video_server remotely)
- Persistent state (robot status, camera feed, connection restore on browser refresh)
- System logging to MySQL with auto-delete after 1 hour
- XSS protection, input validation, URL whitelisting

## Setup

### Azure VM

```bash
sudo apt update && sudo apt install -y nodejs npm mysql-server git
cd ~ && git clone <repo-url> ros-web-challenge
cd ~/ros-web-challenge/web && npm install
sudo mysql -u root robot_db < ~/ros-web-challenge/db_schema.sql
sudo PORT=80 node web/server.js
cloudflared tunnel --url http://localhost:80 > tunnel_web.log 2>&1 &
```

### Laptop

```bash
docker compose up -d
export BACKEND_URL=http://<azure-vm-ip>:80
python3 listener.py
cloudflared tunnel --url http://localhost:9090 > tunnel_ws.log 2>&1 &
cloudflared tunnel --url http://localhost:8080 > tunnel_cam.log 2>&1 &
```

### Browser

Open `http://<azure-vm-ip>` (auto-redirects to HTTPS tunnel). Wait for auto-connect.

## Startup Order

1. Azure VM: `sudo PORT=80 node web/server.js` + cloudflared web tunnel
2. Laptop: `docker compose up -d`
3. Laptop: cloudflared tunnels (ws + cam)
4. Laptop: `python3 listener.py`
5. Browser: open `http://<azure-vm-ip>`
