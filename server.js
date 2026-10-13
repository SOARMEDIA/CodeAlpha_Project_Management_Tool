const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./data/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_pm_jwt_secret_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

// ----------------- AUTH ROUTES -----------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (db.findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'usr-' + Date.now(),
      name,
      email,
      password: hashedPassword,
      role: role || 'Software Engineer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
    };

    db.createUser(newUser);
    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = newUser;
    res.status(201).json({ message: 'User registered', token, user: userSafe });
  } catch {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = user;
    res.json({ message: 'Login successful', token, user: userSafe });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

app.get('/api/team', (req, res) => {
  const users = db.getUsers().map(({ password, ...u }) => u);
  res.json({ users });
});

// ----------------- PROJECT ROUTES -----------------
app.get('/api/projects', optionalAuth, (req, res) => {
  const projects = db.getProjects();
  res.json({ count: projects.length, projects });
});

app.post('/api/projects', authenticate, (req, res) => {
  const { name, description, members } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const newProj = {
    id: 'proj-' + Date.now(),
    name: name.trim(),
    description: description || '',
    creatorId: req.user.id,
    members: Array.isArray(members) && members.length ? members : [req.user.id],
    createdAt: new Date().toISOString()
  };

  db.createProject(newProj);
  io.emit('project:created', newProj);
  res.status(201).json({ message: 'Project created', project: newProj });
});

// ----------------- TASK ROUTES -----------------
app.get('/api/projects/:projectId/tasks', (req, res) => {
  const tasks = db.getTasks(req.params.projectId);
  res.json({ count: tasks.length, tasks });
});

app.post('/api/projects/:projectId/tasks', authenticate, (req, res) => {
  const { title, description, priority, assigneeId, dueDate, tags, status } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const assignee = assigneeId ? db.findUserById(assigneeId) : null;

  const newTask = {
    id: 'task-' + Date.now(),
    projectId: req.params.projectId,
    title: title.trim(),
    description: description || '',
    status: status || 'todo',
    priority: priority || 'medium',
    assigneeId: assignee ? assignee.id : null,
    assigneeName: assignee ? assignee.name : 'Unassigned',
    dueDate: dueDate || null,
    tags: Array.isArray(tags) ? tags : [],
    createdAt: new Date().toISOString()
  };

  db.createTask(newTask);
  io.to(`project_${req.params.projectId}`).emit('task:created', newTask);
  res.status(201).json({ message: 'Task created', task: newTask });
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const updates = req.body;
  if (updates.assigneeId) {
    const assignee = db.findUserById(updates.assigneeId);
    if (assignee) updates.assigneeName = assignee.name;
  }

  const updatedTask = db.updateTask(req.params.id, updates);
  if (!updatedTask) return res.status(404).json({ error: 'Task not found' });

  io.to(`project_${updatedTask.projectId}`).emit('task:updated', updatedTask);
  res.json({ message: 'Task updated', task: updatedTask });
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.deleteTask(req.params.id);
  io.to(`project_${task.projectId}`).emit('task:deleted', { id: req.params.id });
  res.json({ message: 'Task deleted' });
});

// ----------------- COMMENT ROUTES -----------------
app.get('/api/tasks/:taskId/comments', (req, res) => {
  const comments = db.getComments(req.params.taskId);
  res.json({ count: comments.length, comments });
});

app.post('/api/tasks/:taskId/comments', authenticate, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  const task = db.getTaskById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const user = db.findUserById(req.user.id);
  const newComment = {
    id: 'cmt-' + Date.now(),
    taskId: req.params.taskId,
    authorId: user.id,
    authorName: user.name,
    authorAvatar: user.avatar,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  db.addComment(newComment);
  io.to(`project_${task.projectId}`).emit('comment:added', newComment);
  res.status(201).json({ message: 'Comment added', comment: newComment });
});

// ----------------- SOCKET.IO REALTIME -----------------
io.on('connection', (socket) => {
  socket.on('join_project', (projectId) => {
    socket.join(`project_${projectId}`);
  });

  socket.on('leave_project', (projectId) => {
    socket.leave(`project_${projectId}`);
  });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`📋 CodeAlpha Project Management Server running on http://localhost:${PORT}`);
});

