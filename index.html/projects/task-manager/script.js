const STORAGE_KEY = 'sd_tasks';

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let filter = 'all';
let sort = 'newest';

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const categorySelect = document.getElementById('category-select');
const dueDateInput = document.getElementById('due-date');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const emptyTitle = document.getElementById('empty-title');
const emptySub = document.getElementById('empty-sub');
const listFooter = document.getElementById('list-footer');
const footerText = document.getElementById('footer-text');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterTabs = document.querySelectorAll('.filter-tab');
const sortSelect = document.getElementById('sort-select');
const statsChip = document.getElementById('stats-chip-text');

const CATEGORY_ICONS = {
  general: '📋', work: '💼', personal: '👤', shopping: '🛒',
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getSortedFiltered() {
  let list = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  list.sort((a, b) => {
    if (sort === 'newest') return b.createdAt - a.createdAt;
    if (sort === 'oldest') return a.createdAt - b.createdAt;
    if (sort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (sort === 'due') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  return list;
}

function formatDue(dueDate) {
  if (!dueDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dueDate === today) return { text: 'Due today', overdue: false };
  if (dueDate === tomorrow) return { text: 'Due tomorrow', overdue: false };
  if (dueDate < today) {
    const d = new Date(dueDate + 'T12:00:00');
    return { text: `Overdue: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, overdue: true };
  }
  const d = new Date(dueDate + 'T12:00:00');
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
}

function render() {
  const list = getSortedFiltered();
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;

  statsChip.textContent = `${active} active`;

  taskList.innerHTML = '';

  if (list.length === 0) {
    emptyState.hidden = false;
    listFooter.hidden = true;
    if (filter === 'completed') {
      emptyTitle.textContent = 'No completed tasks';
      emptySub.textContent = 'Complete some tasks to see them here.';
    } else if (filter === 'active') {
      emptyTitle.textContent = 'All caught up!';
      emptySub.textContent = 'No active tasks remaining.';
    } else {
      emptyTitle.textContent = 'No tasks yet';
      emptySub.textContent = 'Add a task above to get started.';
    }
    return;
  }

  emptyState.hidden = true;
  listFooter.hidden = false;
  footerText.textContent = `${completed} of ${total} task${total !== 1 ? 's' : ''} completed`;

  list.forEach(task => {
    const due = formatDue(task.dueDate);
    const item = document.createElement('div');
    item.className = `task-item priority-${task.priority}${task.completed ? ' completed' : ''}`;
    item.dataset.id = task.id;

    item.innerHTML = `
      <div class="task-checkbox" role="checkbox" aria-checked="${task.completed}" tabindex="0">
        ${task.completed ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="priority-badge ${task.priority}">${task.priority}</span>
          <span class="category-badge">${CATEGORY_ICONS[task.category] || ''} ${task.category}</span>
          ${due ? `<span class="due-badge${due.overdue ? ' overdue' : ''}">📅 ${due.text}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="delete-btn" title="Delete task" aria-label="Delete task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    item.querySelector('.task-checkbox').addEventListener('click', () => toggleTask(task.id));
    item.querySelector('.task-checkbox').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTask(task.id); }
    });
    item.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

    taskList.appendChild(item);
  });
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) { task.completed = !task.completed; save(); render(); }
}

function deleteTask(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.style.animation = 'none';
    item.style.transition = 'all 0.2s';
    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }, 200);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  tasks.unshift({
    id: Date.now(),
    title,
    priority: prioritySelect.value,
    category: categorySelect.value,
    dueDate: dueDateInput.value || null,
    completed: false,
    createdAt: Date.now(),
  });

  taskInput.value = '';
  dueDateInput.value = '';
  save();
  render();
  taskInput.focus();
});

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filter = tab.dataset.filter;
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    render();
  });
});

sortSelect.addEventListener('change', () => {
  sort = sortSelect.value;
  render();
});

clearCompletedBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
});

render();
