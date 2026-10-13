// CodeAlpha Internship - Task 3: Project Management Tool
// Student: Redeemer Jerrey Kow Williams (CA/DF1/320453)

class OmniBoardApp {
  constructor() {
    this.projects = [];
    this.currentProjectId = null;
    this.tasks = [];
    this.team = [];
    this.activeTask = null;
    this.draggedTaskId = null;
    this.token = localStorage.getItem('omni_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('omni_user') || 'null');

    this.socket = io();
    this.init();
  }

  async init() {
    this.setupSocket();
    this.renderAuth();
    await this.fetchTeam();
    await this.fetchProjects();
  }

  setupSocket() {
    this.socket.on('connect', () => {
      document.getElementById('wsStatus').innerHTML = '<span class="status-dot"></span> Live Sync';
      if (this.currentProjectId) {
        this.socket.emit('join_project', this.currentProjectId);
      }
    });

    this.socket.on('disconnect', () => {
      document.getElementById('wsStatus').innerHTML = '<span class="status-dot" style="background:#ef4444"></span> Reconnecting...';
    });

    this.socket.on('task:created', (task) => {
      if (task.projectId === this.currentProjectId) {
        if (!this.tasks.some(t => t.id === task.id)) {
          this.tasks.push(task);
          this.renderBoard();
        }
      }
    });

    this.socket.on('task:updated', (task) => {
      if (task.projectId === this.currentProjectId) {
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          this.tasks[idx] = task;
          this.renderBoard();
          if (this.activeTask && this.activeTask.id === task.id) {
            this.activeTask = task;
            this.syncTaskModal();
          }
        }
      }
    });

    this.socket.on('task:deleted', ({ id }) => {
      this.tasks = this.tasks.filter(t => t.id !== id);
      this.renderBoard();
      if (this.activeTask && this.activeTask.id === id) {
        this.closeTaskDetailModal();
      }
    });

    this.socket.on('comment:added', (comment) => {
      if (this.activeTask && this.activeTask.id === comment.taskId) {
        this.loadComments(comment.taskId);
      }
    });
  }

  renderAuth() {
    const container = document.getElementById('authContainer');
    if (this.currentUser) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${this.currentUser.avatar}" style="width: 32px; height: 32px; border-radius: 50%;">
          <span style="font-size: 0.88rem; font-weight: 600;">${this.currentUser.name}</span>
          <button class="btn btn-outline btn-sm" onclick="pmApp.logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn btn-outline btn-sm" onclick="pmApp.openAuthModal('login')">
          <i class="fa-regular fa-user"></i> Sign In
        </button>
      `;
    }
  }

  async fetchTeam() {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      this.team = data.users || [];
      this.populateAssigneeDropdowns();
    } catch {}
  }

  populateAssigneeDropdowns() {
    const options = '<option value="">Unassigned</option>' +
      this.team.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');

    const newSelect = document.getElementById('newTaskAssignee');
    const modalSelect = document.getElementById('modalAssigneeSelect');
    if (newSelect) newSelect.innerHTML = options;
    if (modalSelect) modalSelect.innerHTML = options;

    const avatarsContainer = document.getElementById('teamAvatars');
    if (avatarsContainer) {
      avatarsContainer.innerHTML = this.team.map(u => `
        <img src="${u.avatar}" title="${u.name} - ${u.role}">
      `).join('');
    }
  }

  async fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      this.projects = data.projects || [];

      const select = document.getElementById('projectSelect');
      select.innerHTML = this.projects.map(p => `
        <option value="${p.id}">${p.name}</option>
      `).join('');

      if (this.projects.length > 0) {
        this.selectProject(this.projects[0].id);
      }
    } catch {
      this.showToast('Failed to load projects', 'error');
    }
  }

  async selectProject(projectId) {
    if (this.currentProjectId) {
      this.socket.emit('leave_project', this.currentProjectId);
    }

    this.currentProjectId = projectId;
    this.socket.emit('join_project', projectId);

    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      document.getElementById('activeProjectTitle').textContent = project.name;
      document.getElementById('activeProjectDesc').textContent = project.description || 'Collaborative Sprint Board';
      document.getElementById('projectSelect').value = projectId;
    }

    await this.fetchTasks(projectId);
  }

  async fetchTasks(projectId) {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      this.tasks = data.tasks || [];
      this.renderBoard();
    } catch {
      this.showToast('Failed to load tasks', 'error');
    }
  }

  renderBoard() {
    const columns = ['todo', 'in-progress', 'review', 'done'];
    const counts = { 'todo': 0, 'in-progress': 0, 'review': 0, 'done': 0 };

    columns.forEach(col => {
      document.getElementById(`col-${col}`).innerHTML = '';
    });

    this.tasks.forEach(task => {
      const status = task.status || 'todo';
      counts[status] = (counts[status] || 0) + 1;

      const card = document.createElement('div');
      card.className = 'task-card';
      card.draggable = true;
      card.id = `card-${task.id}`;
      card.onclick = () => this.openTaskDetail(task.id);
      card.ondragstart = (e) => this.handleDragStart(e, task.id);
      card.ondragend = (e) => this.handleDragEnd(e);

      card.innerHTML = `
        ${task.tags && task.tags.length ? `
          <div class="card-tags">
            ${task.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
          </div>
        ` : ''}
        <h4 class="card-title">${this.escape(task.title)}</h4>
        <div class="card-footer">
          <span class="priority-pill prio-${task.priority}">${task.priority}</span>
          <div class="card-assignee">
            <i class="fa-regular fa-user"></i>
            <span>${task.assigneeName ? task.assigneeName.split(' ')[0] : 'Unassigned'}</span>
          </div>
        </div>
      `;

      const targetCol = document.getElementById(`col-${status}`);
      if (targetCol) targetCol.appendChild(card);
    });

    Object.keys(counts).forEach(k => {
      const el = document.getElementById(`count-${k}`);
      if (el) el.textContent = counts[k];
    });
  }

  // Drag and Drop
  handleDragStart(e, taskId) {
    this.draggedTaskId = taskId;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', taskId);
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  }

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  async handleDrop(e, targetStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const taskId = this.draggedTaskId;
    if (!taskId) return;

    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status !== targetStatus) {
      task.status = targetStatus;
      this.renderBoard();

      // persist to server
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: targetStatus })
        });
      } catch {
        this.showToast('Failed to update task status', 'error');
      }
    }
  }

  // Task Detail Modal
  async openTaskDetail(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.activeTask = task;

    this.syncTaskModal();
    await this.loadComments(taskId);
    document.getElementById('taskDetailModal').classList.add('active');
  }

  syncTaskModal() {
    const t = this.activeTask;
    document.getElementById('modalTaskTitle').textContent = t.title;
    document.getElementById('modalTaskDesc').textContent = t.description || 'No additional details provided.';
    document.getElementById('modalStatusSelect').value = t.status;
    document.getElementById('modalPrioritySelect').value = t.priority;
    document.getElementById('modalAssigneeSelect').value = t.assigneeId || '';
    document.getElementById('modalDueDate').textContent = t.dueDate || 'No due date set';

    document.getElementById('modalTaskBadges').innerHTML = `
      <span class="priority-pill prio-${t.priority}">${t.priority}</span>
      ${t.tags ? t.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('') : ''}
    `;
  }

  closeTaskDetailModal() {
    document.getElementById('taskDetailModal').classList.remove('active');
    this.activeTask = null;
  }

  async updateTaskField(field, value) {
    if (!this.activeTask) return;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(`/api/tasks/${this.activeTask.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      if (res.ok) {
        this.activeTask = data.task;
        this.syncTaskModal();
        this.showToast('Task updated');
      }
    } catch {}
  }

  async deleteCurrentTask() {
    if (!this.activeTask) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const headers = {};
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      await fetch(`/api/tasks/${this.activeTask.id}`, { method: 'DELETE', headers });
      this.closeTaskDetailModal();
      this.showToast('Task deleted');
    } catch {}
  }

  async loadComments(taskId) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json();
      const list = document.getElementById('modalCommentsContainer');
      const comments = data.comments || [];

      if (comments.length === 0) {
        list.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem; padding: 10px;">No comments yet. Start the conversation!</p>';
      } else {
        list.innerHTML = comments.map(c => `
          <div class="comment-card">
            <div class="comment-author">
              <span>${c.authorName}</span>
              <span class="comment-time">${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p style="color: #cbd5e1; margin-top: 4px;">${this.escape(c.text)}</p>
          </div>
        `).join('');
      }
    } catch {}
  }

  async submitComment(e) {
    e.preventDefault();
    if (!this.token) {
      this.openAuthModal('login');
      return;
    }
    const input = document.getElementById('modalCommentInput');
    const text = input.value.trim();
    if (!text || !this.activeTask) return;

    try {
      const res = await fetch(`/api/tasks/${this.activeTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        input.value = '';
        this.loadComments(this.activeTask.id);
      }
    } catch {}
  }

  // Modals Creation
  openNewTaskModal(defaultStatus = 'todo') {
    if (!this.token) {
      this.openAuthModal('login');
      return;
    }
    document.getElementById('newTaskStatus').value = defaultStatus;
    document.getElementById('newTaskModal').classList.add('active');
  }
  closeNewTaskModal() {
    document.getElementById('newTaskModal').classList.remove('active');
  }

  async createTask(e) {
    e.preventDefault();
    const title = document.getElementById('newTaskTitle').value;
    const description = document.getElementById('newTaskDesc').value;
    const status = document.getElementById('newTaskStatus').value;
    const priority = document.getElementById('newTaskPriority').value;
    const assigneeId = document.getElementById('newTaskAssignee').value;
    const dueDate = document.getElementById('newTaskDueDate').value;
    const tagsRaw = document.getElementById('newTaskTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
      const res = await fetch(`/api/projects/${this.currentProjectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ title, description, status, priority, assigneeId, dueDate, tags })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.closeNewTaskModal();
      this.showToast('Task created successfully');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openNewProjectModal() {
    if (!this.token) {
      this.openAuthModal('login');
      return;
    }
    document.getElementById('newProjectModal').classList.add('active');
  }
  closeNewProjectModal() {
    document.getElementById('newProjectModal').classList.remove('active');
  }

  async createProject(e) {
    e.preventDefault();
    const name = document.getElementById('newProjName').value;
    const description = document.getElementById('newProjDesc').value;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.closeNewProjectModal();
      this.showToast('Project created!');
      await this.fetchProjects();
      this.selectProject(data.project.id);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Auth
  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    document.getElementById('authModal').classList.add('active');
  }
  closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
  }
  switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    document.getElementById('tabRegister').classList.toggle('active', !isLogin);
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('registerForm').style.display = !isLogin ? 'block' : 'none';
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('omni_token', data.token);
      localStorage.setItem('omni_user', JSON.stringify(data.user));

      this.closeAuthModal();
      this.renderAuth();
      this.showToast(`Logged in as ${data.user.name}`);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const role = document.getElementById('regRole').value;
    const password = document.getElementById('regPass').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('omni_token', data.token);
      localStorage.setItem('omni_user', JSON.stringify(data.user));

      this.closeAuthModal();
      this.renderAuth();
      await this.fetchTeam();
      this.showToast(`Welcome, ${data.user.name}!`);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
    this.renderAuth();
    this.showToast('Logged out');
  }

  escape(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
}

const pmApp = new OmniBoardApp();

