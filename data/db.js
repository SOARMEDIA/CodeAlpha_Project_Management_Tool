const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function ensureFile(filename, defaultContent = []) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf-8');
  }
  return filePath;
}

const defaultPasswordHash = bcrypt.hashSync('password123', 8);

const defaultUsers = [
  {
    id: "usr-redeemer",
    name: "Redeemer Jerrey Kow Williams",
    email: "redeemer@codealpha.tech",
    password: defaultPasswordHash,
    role: "Project Lead",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-elena",
    name: "Elena Rostova",
    email: "elena@codealpha.tech",
    role: "Senior UI/UX Designer",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-david",
    name: "David Kim",
    email: "david@codealpha.tech",
    role: "Backend Architect",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80"
  }
];

const defaultProjects = [
  {
    id: "proj-1",
    name: "CodeAlpha Web Portal 2.0",
    description: "Revamp of the internal intern management and project submission portal with real-time analytics.",
    creatorId: "usr-redeemer",
    members: ["usr-redeemer", "usr-elena", "usr-david"],
    createdAt: "2026-10-01T09:00:00.000Z"
  },
  {
    id: "proj-2",
    name: "Mobile Microservices API",
    description: "High-performance edge microservices architecture for real-time mobile push notifications.",
    creatorId: "usr-david",
    members: ["usr-david", "usr-redeemer"],
    createdAt: "2026-10-05T14:30:00.000Z"
  }
];

const defaultTasks = [
  {
    id: "task-1",
    projectId: "proj-1",
    title: "Implement JWT Token Refresh Strategy",
    description: "Design and implement sliding session token refresh logic with HttpOnly cookie handling for high security.",
    status: "in-progress", // 'todo', 'in-progress', 'review', 'done'
    priority: "high", // 'low', 'medium', 'high', 'urgent'
    assigneeId: "usr-redeemer",
    assigneeName: "Redeemer Jerrey Kow Williams",
    dueDate: "2026-10-25",
    tags: ["Backend", "Security"],
    createdAt: "2026-10-10T11:00:00.000Z"
  },
  {
    id: "task-2",
    projectId: "proj-1",
    title: "Finalize Design System & Glassmorphic Tokens",
    description: "Create accessible color palettes, dark mode tokens, and responsive modal components in Figma.",
    status: "done",
    priority: "medium",
    assigneeId: "usr-elena",
    assigneeName: "Elena Rostova",
    dueDate: "2026-10-15",
    tags: ["Design", "UI"],
    createdAt: "2026-10-08T10:00:00.000Z"
  },
  {
    id: "task-3",
    projectId: "proj-1",
    title: "Setup Redis Queue for Asynchronous Email Delivery",
    description: "Integrate BullMQ queue processor to dispatch verification and submission emails without blocking requests.",
    status: "todo",
    priority: "urgent",
    assigneeId: "usr-david",
    assigneeName: "David Kim",
    dueDate: "2026-10-28",
    tags: ["DevOps", "Infrastructure"],
    createdAt: "2026-10-12T15:00:00.000Z"
  },
  {
    id: "task-4",
    projectId: "proj-1",
    title: "End-to-End WebSocket Testing for Live Board",
    description: "Write integration tests ensuring concurrent board card moves are broadcasted and resolved cleanly.",
    status: "review",
    priority: "high",
    assigneeId: "usr-redeemer",
    assigneeName: "Redeemer Jerrey Kow Williams",
    dueDate: "2026-10-20",
    tags: ["QA", "WebSockets"],
    createdAt: "2026-10-11T09:30:00.000Z"
  }
];

const defaultComments = [
  {
    id: "cmt-1",
    taskId: "task-1",
    authorId: "usr-david",
    authorName: "David Kim",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    text: "Make sure we store refresh tokens in a hashed format in the DB.",
    createdAt: "2026-10-11T14:00:00.000Z"
  },
  {
    id: "cmt-2",
    taskId: "task-1",
    authorId: "usr-redeemer",
    authorName: "Redeemer Jerrey Kow Williams",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    text: "Will do! Using bcrypt with salt rounds configured.",
    createdAt: "2026-10-11T14:25:00.000Z"
  }
];

class ProjectDB {
  constructor() {
    this.usersFile = ensureFile('users.json', defaultUsers);
    this.projectsFile = ensureFile('projects.json', defaultProjects);
    this.tasksFile = ensureFile('tasks.json', defaultTasks);
    this.commentsFile = ensureFile('comments.json', defaultComments);
  }

  read(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8') || '[]');
    } catch {
      return [];
    }
  }

  write(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Users
  getUsers() { return this.read(this.usersFile); }
  findUserById(id) { return this.getUsers().find(u => u.id === id); }
  findUserByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); }
  createUser(u) {
    const users = this.getUsers();
    users.push(u);
    this.write(this.usersFile, users);
    return u;
  }

  // Projects
  getProjects() { return this.read(this.projectsFile); }
  getProjectById(id) { return this.getProjects().find(p => p.id === id); }
  createProject(proj) {
    const projects = this.getProjects();
    projects.push(proj);
    this.write(this.projectsFile, projects);
    return proj;
  }

  // Tasks
  getTasks(projectId) {
    const tasks = this.read(this.tasksFile);
    return projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
  }
  getTaskById(id) { return this.read(this.tasksFile).find(t => t.id === id); }
  createTask(task) {
    const tasks = this.read(this.tasksFile);
    tasks.unshift(task);
    this.write(this.tasksFile, tasks);
    return task;
  }
  updateTask(id, updates) {
    const tasks = this.read(this.tasksFile);
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates };
      this.write(this.tasksFile, tasks);
      return tasks[idx];
    }
    return null;
  }
  deleteTask(id) {
    let tasks = this.read(this.tasksFile);
    tasks = tasks.filter(t => t.id !== id);
    this.write(this.tasksFile, tasks);
    return true;
  }

  // Comments
  getComments(taskId) {
    return this.read(this.commentsFile).filter(c => c.taskId === taskId);
  }
  addComment(cmt) {
    const comments = this.read(this.commentsFile);
    comments.push(cmt);
    this.write(this.commentsFile, comments);
    return cmt;
  }
}

module.exports = new ProjectDB();

