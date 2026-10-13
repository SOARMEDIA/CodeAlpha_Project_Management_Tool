# CodeAlpha_Project_Management_Tool
### Full Stack Development Internship — Task 3

**Intern Name:** REDEEMER JERREY KOW WILLIAMS  
**Student ID:** CA/DF1/320453  
**Domain:** Full Stack Web Development  
**Batch:** 20th October 2026 to 20th November 2026  
**Company:** [CodeAlpha](https://www.codealpha.tech)

---

## 📌 Project Overview
**OmniBoard** is a collaborative real-time Kanban project management tool (inspired by Trello and Linear) built for Task 3 of the CodeAlpha Full Stack Development Internship.

It empowers teams to create group projects, break down deliverables into cards across workflow states (To Do, In Progress, In Review, Completed), assign team members, discuss tasks with comment threads, and synchronize board updates in real time using **WebSockets (Socket.io)**.

---

## 🚀 Key Features

1. **Kanban Board & Drag-and-Drop:**
   - 4-column workflow pipeline (To Do, In Progress, In Review, Completed).
   - Smooth native HTML5 drag-and-drop card movement across columns with automatic backend state persistence.

2. **Group Projects & Team Collaboration:**
   - Multi-project selector with instant project switching.
   - Create new projects and manage member assignments.
   - Active team presence avatars.

3. **Task Cards & Rich Metadata:**
   - Priority indicators (`Urgent`, `High`, `Medium`, `Low`).
   - Categorization tags (Frontend, Backend, DevOps, Security, etc.).
   - Due dates and assignee details.

4. **Task Discussion & Comments:**
   - Threaded comments per task for context-specific communication.
   - Live comment sync to all active collaborators.

5. **Real-Time WebSocket Synchronization (Bonus Feature):**
   - Built on `Socket.io` rooms per project.
   - Instant visual update whenever a teammate creates, moves, or updates a card without page refreshes.

6. **Authentication & Security:**
   - Secure account registration and login with `bcryptjs` and `JWT`.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Modern dark glassmorphic UI), JavaScript (ES6+), FontAwesome
- **Backend:** Node.js, Express.js REST API
- **Real-Time Engine:** Socket.io WebSockets
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Database:** Persistent file-backed store (`users.json`, `projects.json`, `tasks.json`, `comments.json`)

---

## 🏁 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/CodeAlpha_Project_Management_Tool.git
   cd CodeAlpha_Project_Management_Tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch server:
   ```bash
   npm start
   ```

4. Navigate to:
   ```text
   http://localhost:3002
   ```

---

## 📡 REST API & WebSocket Events

### REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user & return JWT |
| `GET` | `/api/projects` | List all group projects |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/:id/tasks` | Get all tasks for project |
| `POST` | `/api/projects/:id/tasks` | Create task in project |
| `PUT` | `/api/tasks/:id` | Update task status, priority, assignee |
| `DELETE` | `/api/tasks/:id` | Delete task card |
| `GET` | `/api/tasks/:id/comments` | List comments for task |
| `POST` | `/api/tasks/:id/comments` | Add comment to task |

### WebSocket Events
- `join_project` / `leave_project`: Room subscriptions.
- `task:created`: Broadcasted when a new card is added.
- `task:updated`: Broadcasted on status drag-drop or property change.
- `task:deleted`: Broadcasted when a card is removed.
- `comment:added`: Broadcasted on new task comment.

---

## 📄 License
This project is submitted as part of the CodeAlpha Internship Program. Licensed under the MIT License.

