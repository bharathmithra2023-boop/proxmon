# ProxMon

A web-based monitoring and management dashboard for Proxmox VE. ProxMon provides real-time VM/LXC metrics, lifecycle controls, IP address tracking, and multi-user access with role-based permissions — all in a single self-hosted Docker deployment.

---

## Features

- **Live metrics** — CPU, memory, disk, and network stats streamed over WebSocket (5-second refresh)
- **VM & LXC management** — start, stop, shutdown, reboot, create, clone, and delete VMs and containers
- **IP address tracking** — auto-detects IPs via guest agent, cloud-init, and ARP; supports manual override and persistence
- **VM locking** — lock VMs to prevent accidental actions
- **Role-based access control** — three roles: `admin`, `operator`, `viewer`
- **User management** — full CRUD for users, admin-only
- **Historical metrics** — RRD chart data with configurable timeframes
- **Node overview** — Proxmox node status and storage inventory

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js, Express, TypeScript        |
| Frontend  | React, TypeScript, Vite             |
| Transport | WebSocket (`ws`)                    |
| Auth      | JWT (12h expiry), bcrypt passwords  |
| Deploy    | Docker Compose, Nginx               |

---

## Prerequisites

- Docker and Docker Compose
- A running Proxmox VE node (tested against the Proxmox API v2)
- A Proxmox API token (see below)

### Creating a Proxmox API Token

1. In the Proxmox web UI go to **Datacenter → Permissions → API Tokens**
2. Create a token for a user that has at least `VM.PowerMgmt`, `VM.Monitor`, and `Datastore.Audit` privileges
3. Copy the token ID and secret — you will need them in the configuration step

---

## Quick Start

```bash
git clone https://github.com/bharathmithra2023-boop/proxmon.git
cd proxmon

# Copy and fill in the environment file
cp backend/.env.example backend/.env
$EDITOR backend/.env

# Build and start
docker compose up -d
```

The frontend will be available on **port 80** and the backend API on **port 4000** of the host machine (both containers use `network_mode: host`).

Default credentials on first boot:

| Username | Password  | Role  |
|----------|-----------|-------|
| `admin`  | `admin123`| admin |

**Change the default password immediately after first login.**

---

## Configuration

All backend configuration is done via `backend/.env`:

| Variable               | Required | Default              | Description                                                  |
|------------------------|----------|----------------------|--------------------------------------------------------------|
| `PROXMOX_HOST`         | Yes      | —                    | Hostname or IP of your Proxmox node                         |
| `PROXMOX_PORT`         | Yes      | `8006`               | Proxmox API port                                             |
| `PROXMOX_NODE`         | Yes      | —                    | Proxmox node name (e.g. `pve`)                              |
| `PROXMOX_TOKEN_ID`     | Yes      | —                    | API token ID (e.g. `root@pam!proxmon`)                      |
| `PROXMOX_TOKEN_SECRET` | Yes      | —                    | API token secret (UUID)                                      |
| `PROXMON_IP`           | No       | —                    | IP of the ProxMon host, used for ARP-based IP detection     |
| `PORT`                 | No       | `4000`               | Port the backend listens on                                  |
| `JWT_SECRET`           | Yes      | *(insecure default)* | Secret used to sign JWTs — **must be changed in production** |
| `DATA_DIR`             | No       | `/app/data`          | Directory where users and IP overrides are persisted        |
| `VM_BRIDGE`            | No       | `vmbr0`              | Network bridge used when creating new VMs                   |
| `VMID_MIN`             | No       | `300`                | Lower bound of the VMID range ProxMon manages               |
| `VMID_MAX`             | No       | `399`                | Upper bound of the VMID range ProxMon manages               |
| `VM_NETWORK`           | No       | `10.10.16.0/24`      | Network subnet shown in the UI for reference                |

---

## API Reference

All responses follow the shape `{ success: boolean, data?: ..., error?: string }`.

Protected routes require the header `Authorization: Bearer <token>`.

### Authentication

| Method | Path            | Auth     | Description                        |
|--------|-----------------|----------|------------------------------------|
| POST   | `/api/auth/login` | Public | Returns a JWT and user profile     |
| GET    | `/api/auth/me`    | Required | Returns the current user's profile |

**Login request body:**
```json
{ "username": "admin", "password": "admin123" }
```

---

### Health

| Method | Path          | Auth   | Description                              |
|--------|---------------|--------|------------------------------------------|
| GET    | `/api/health` | Public | Returns service status and active config |

---

### Nodes

All node routes require authentication.

| Method | Path                                  | Description                          |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/nodes/status`                   | Proxmox node CPU / memory / uptime   |
| GET    | `/api/nodes/storages`                 | List available storage pools         |
| GET    | `/api/nodes/storages/:storage/isos`   | List ISO images in a storage pool    |

---

### VMs & Containers

All VM routes require authentication.

| Method | Path                        | Description                                              |
|--------|-----------------------------|----------------------------------------------------------|
| GET    | `/api/vms`                  | List all VMs and LXC containers with lock status        |
| GET    | `/api/vms/ips`              | Get IP addresses for all VMs (auto-detected + overrides)|
| PUT    | `/api/vms/:type/:vmid/ip`   | Set or clear a manual IP override for a VM              |
| GET    | `/api/vms/templates`        | List VM templates available for cloning                 |
| GET    | `/api/vms/nextid`           | Get the next available VMID within the configured range |
| GET    | `/api/vms/:type/:vmid/status` | Get detailed status for a single VM                  |
| GET    | `/api/vms/:type/:vmid/rrd`  | Get historical RRD metrics (`?timeframe=hour\|day\|week`)|
| GET    | `/api/vms/:type/:vmid/config` | Get the full Proxmox config for a VM                 |

`:type` is either `qemu` (VM) or `lxc` (container).

**IP override body:**
```json
{ "ip": "10.10.16.42" }   // set override
{ "ip": "" }              // clear override (reverts to auto-detection)
```

---

### Actions

Action routes require authentication **and** at least the `operator` role. Delete requires `admin`.

| Method | Path                             | Role     | Description                        |
|--------|----------------------------------|----------|------------------------------------|
| POST   | `/api/actions/:type/:vmid/start`   | operator | Start a VM / container            |
| POST   | `/api/actions/:type/:vmid/stop`    | operator | Force-stop a VM / container       |
| POST   | `/api/actions/:type/:vmid/shutdown`| operator | Graceful shutdown                 |
| POST   | `/api/actions/:type/:vmid/reboot`  | operator | Reboot a VM / container           |
| POST   | `/api/actions/create`              | operator | Create a new VM                   |
| POST   | `/api/actions/clone`               | operator | Clone a VM from a template        |
| POST   | `/api/actions/:type/:vmid/lock`    | operator | Lock a VM (prevents actions)      |
| POST   | `/api/actions/:type/:vmid/unlock`  | operator | Unlock a VM                       |
| DELETE | `/api/actions/:type/:vmid`         | admin    | Delete a VM / container           |
| GET    | `/api/actions/task/:upid`          | operator | Poll a Proxmox task by UPID       |

**Create VM body:**
```json
{
  "name": "my-vm",
  "cores": 2,
  "memory": 2048,
  "diskSize": 20,
  "storage": "local-lvm",
  "iso": "local:iso/ubuntu-24.04.iso",
  "ostype": "l26"
}
```

**Clone VM body:**
```json
{
  "sourceVmid": 9000,
  "name": "cloned-vm",
  "full": true
}
```

---

### Users

All user management routes require authentication **and** the `admin` role.

| Method | Path             | Description                       |
|--------|------------------|-----------------------------------|
| GET    | `/api/users`     | List all users (passwords omitted)|
| POST   | `/api/users`     | Create a new user                 |
| PUT    | `/api/users/:id` | Update a user                     |
| DELETE | `/api/users/:id` | Delete a user                     |

**Create user body:**
```json
{
  "username": "jdoe",
  "password": "s3cur3p@ss",
  "role": "operator",
  "fullName": "Jane Doe",
  "email": "jdoe@example.com"
}
```

Roles: `admin` | `operator` | `viewer`

Safety constraints enforced by the API:
- Cannot delete the last active admin account
- Cannot delete your own account

---

## WebSocket

The backend exposes a WebSocket endpoint at `ws://<host>:4000/ws`.

**Authentication** is done via a query parameter:
```
ws://<host>:4000/ws?token=<jwt>
```
Connections without a valid token are closed immediately with code `4001`.

**Server → Client messages:**

| Type      | Payload                                 | Description                         |
|-----------|-----------------------------------------|-------------------------------------|
| `metrics` | `{ vms: VM[], nodeStatus: NodeStatus }` | Full metrics push every 5 seconds   |
| `error`   | `{ message: string }`                   | Emitted when a Proxmox fetch fails  |
| `pong`    | _(none)_                                | Response to a client `ping` message |

**Client → Server messages:**

| Type   | Description            |
|--------|------------------------|
| `ping` | Keepalive — server responds with `pong` |

The polling interval starts when the first client connects and stops when the last client disconnects.

---

## Role Reference

| Capability                        | viewer | operator | admin |
|-----------------------------------|:------:|:--------:|:-----:|
| View VMs and metrics              | ✓      | ✓        | ✓     |
| View node status                  | ✓      | ✓        | ✓     |
| Start / stop / reboot / shutdown  |        | ✓        | ✓     |
| Create / clone VMs                |        | ✓        | ✓     |
| Lock / unlock VMs                 |        | ✓        | ✓     |
| Set IP overrides                  |        | ✓        | ✓     |
| Delete VMs                        |        |          | ✓     |
| Manage users                      |        |          | ✓     |

---

## Development

### Backend

```bash
cd backend
cp .env.example .env   # fill in your Proxmox details
npm install
npm run dev            # ts-node-dev with hot reload on port 4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Vite dev server, proxies /api to localhost:4000
```

### Docker (production)

```bash
docker compose up --build
```

Data is persisted in the `proxmon-data` Docker volume (mounted at `/app/data` in the backend container). This volume stores:
- `users.json` — user accounts and hashed passwords
- IP override records

---

## Security Notes

- Change `JWT_SECRET` to a long random string before deploying
- Change the default `admin` / `admin123` credentials immediately
- The backend uses `cors({ origin: "*" })` — restrict this in production if the API should not be publicly reachable
- Proxmox API token permissions should be scoped as narrowly as possible for your use case
