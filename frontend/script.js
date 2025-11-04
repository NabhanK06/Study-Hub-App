// API Configuration
const API_URL = 'https://study-hub-backend.onrender.com/api';

// Data storage
let data = {
    flashcards: [],
    notes: [],
    progress: {}
};

let currentUser = null;
let authToken = null;

// Helper functions for token management
function setAuthToken(token) {
    authToken = token;
    localStorage.setItem('authToken', token);
}

function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('authToken');
    }
    return authToken;
}

function clearAuthToken() {
    authToken = null;
    localStorage.removeItem('authToken');
}

// API Helper function
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Authentication functions
async function checkAuth() {
    const token = getAuthToken();
    const savedUser = localStorage.getItem('currentUser');

    if (token && savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        await init();
    } else {
        clearAuthToken();
        localStorage.removeItem('currentUser');
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.name;
}

function switchLoginTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.login-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
    
    // Clear messages
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('signupMessage').textContent = '';
    document.getElementById('loginMessage').className = 'auth-message';
    document.getElementById('signupMessage').className = 'auth-message';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        setAuthToken(data.token);
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        messageEl.textContent = 'Login successful!';
        messageEl.className = 'auth-message success';
        
        setTimeout(() => {
            showMainApp();
            init();
        }, 500);
    } catch (error) {
        messageEl.textContent = error.message || 'Invalid email or password';
        messageEl.className = 'auth-message error';
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const messageEl = document.getElementById('signupMessage');
    
    // Validation
    if (password !== confirmPassword) {
        messageEl.textContent = 'Passwords do not match';
        messageEl.className = 'auth-message error';
        return;
    }
    
    if (password.length < 6) {
        messageEl.textContent = 'Password must be at least 6 characters';
        messageEl.className = 'auth-message error';
        return;
    }
    
    try {
        const data = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        setAuthToken(data.token);
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        messageEl.textContent = 'Account created successfully! Logging you in...';
        messageEl.className = 'auth-message success';
        
        setTimeout(() => {
            showMainApp();
            init();
        }, 1000);
    } catch (error) {
        messageEl.textContent = error.message || 'Failed to create account';
        messageEl.className = 'auth-message error';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuthToken();
        localStorage.removeItem('currentUser');
        currentUser = null;
        data = { flashcards: [], notes: [], progress: {} };
        
        showLoginPage();
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('signupForm').reset();
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('signupMessage').textContent = '';
    }
}

// Load data from backend
async function loadData() {
    if (!currentUser) return;
    
    try {
        // Load flashcards
        const flashcards = await apiRequest('/flashcards');
        data.flashcards = flashcards;
        
        // Load notes
        const notes = await apiRequest('/notes');
        data.notes = notes;
        
        // Load progress
        const progress = await apiRequest('/progress');
        data.progress = progress;
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.message === 'Invalid token') {
            handleLogout();
        }
    }
}

// Initialize app
async function init() {
    await loadData();
    updateDashboard();
    updateFlashcardsList();
    updateNotesList();
    updateFilters();
}

// Switch main tabs
function switchTab(tabName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('#mainApp > .tabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Switch create tabs
function switchCreateTab(type) {
    document.querySelectorAll('#create .tabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (type === 'flashcard') {
        document.getElementById('createFlashcard').style.display = 'block';
        document.getElementById('createNote').style.display = 'none';
    } else {
        document.getElementById('createFlashcard').style.display = 'none';
        document.getElementById('createNote').style.display = 'block';
    }
}

// Create flashcard
async function createFlashcard() {
    const subject = document.getElementById('flashcardSubject').value.trim();
    const front = document.getElementById('flashcardFront').value.trim();
    const back = document.getElementById('flashcardBack').value.trim();

    if (!subject || !front || !back) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const newFlashcard = await apiRequest('/flashcards', {
            method: 'POST',
            body: JSON.stringify({ subject, front, back })
        });

        data.flashcards.push(newFlashcard);

        if (!data.progress[subject]) {
            data.progress[subject] = { total: 0, mastered: 0 };
        }
        data.progress[subject].total++;
        
        document.getElementById('flashcardSubject').value = '';
        document.getElementById('flashcardFront').value = '';
        document.getElementById('flashcardBack').value = '';

        alert('Flashcard created successfully!');
        updateDashboard();
        updateFlashcardsList();
        updateFilters();
    } catch (error) {
        alert('Failed to create flashcard: ' + error.message);
    }
}

// Create note
async function createNote() {
    const subject = document.getElementById('noteSubject').value.trim();
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!subject || !title || !content) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const newNote = await apiRequest('/notes', {
            method: 'POST',
            body: JSON.stringify({ subject, title, content })
        });

        data.notes.push(newNote);
        
        document.getElementById('noteSubject').value = '';
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';

        alert('Note created successfully!');
        updateNotesList();
        updateFilters();
    } catch (error) {
        alert('Failed to create note: ' + error.message);
    }
}

// Update dashboard
function updateDashboard() {
    const grid = document.getElementById('subjectGrid');
    const subjects = Object.keys(data.progress);

    if (subjects.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No subjects yet</h3><p>Create flashcards to get started!</p></div>';
        return;
    }

    grid.innerHTML = subjects.map(subject => {
        const prog = data.progress[subject];
        const percentage = prog.total > 0 ? Math.round((prog.mastered / prog.total) * 100) : 0;
        const isWeak = percentage < 50;

        return `
            <div class="subject-card ${isWeak ? 'weak' : ''}">
                <div class="subject-header">
                    <div class="subject-name">${subject}</div>
                    ${isWeak ? '<span class="weak-badge">Needs Practice</span>' : ''}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%">
                        ${percentage}%
                    </div>
                </div>
                <div class="stats">
                    <span class="stat">📝 ${prog.total} cards</span>
                    <span class="stat">✅ ${prog.mastered} mastered</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update flashcards list
function updateFlashcardsList() {
    const list = document.getElementById('flashcardsList');
    const filter = document.getElementById('flashcardFilter').value;
    
    let filtered = data.flashcards;
    if (filter !== 'all') {
        filtered = data.flashcards.filter(f => f.subject === filter);
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><h3>No flashcards found</h3><p>Create your first flashcard to start learning!</p></div>';
        return;
    }

    list.innerHTML = filtered.map(card => `
        <div class="flashcard" id="card-${card.id}" onclick="flipCard(${card.id})">
            <div class="front">
                <div class="flashcard-content">${card.front}</div>
                <div class="flashcard-subject">${card.subject}</div>
            </div>
            <div class="back">
                <div class="flashcard-content">${card.back}</div>
                <div class="card-actions">
                    <button class="action-btn" onclick="toggleMastered(${card.id}, event)">${card.mastered ? '✅ Mastered' : 'Mark as Mastered'}</button>
                    <button class="action-btn delete-btn" onclick="deleteFlashcard(${card.id}, event)">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Flip flashcard
function flipCard(id) {
    const card = document.getElementById(`card-${id}`);
    card.classList.toggle('flipped');
}

// Toggle mastered status
async function toggleMastered(id, event) {
    event.stopPropagation();
    const card = data.flashcards.find(c => c.id === id);
    if (!card) return;
    
    try {
        const oldStatus = card.mastered;
        const newMastered = !card.mastered;
        
        const updatedCard = await apiRequest(`/flashcards/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ mastered: newMastered })
        });

        card.mastered = updatedCard.mastered;
        
        if (card.mastered && !oldStatus) {
            data.progress[card.subject].mastered++;
        } else if (!card.mastered && oldStatus) {
            data.progress[card.subject].mastered--;
        }

        updateDashboard();
        updateFlashcardsList();
    } catch (error) {
        alert('Failed to update flashcard: ' + error.message);
    }
}

// Delete flashcard
async function deleteFlashcard(id, event) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    
    try {
        await apiRequest(`/flashcards/${id}`, {
            method: 'DELETE'
        });

        const card = data.flashcards.find(c => c.id === id);
        if (card) {
            data.progress[card.subject].total--;
            if (card.mastered) {
                data.progress[card.subject].mastered--;
            }
            
            data.flashcards = data.flashcards.filter(c => c.id !== id);
            updateDashboard();
            updateFlashcardsList();
        }
    } catch (error) {
        alert('Failed to delete flashcard: ' + error.message);
    }
}

// Update notes list
function updateNotesList() {
    const list = document.getElementById('notesList');
    const filter = document.getElementById('notesFilter').value;
    
    let filtered = data.notes;
    if (filter !== 'all') {
        filtered = data.notes.filter(n => n.subject === filter);
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><h3>No notes found</h3><p>Create your first note to start organizing your knowledge!</p></div>';
        return;
    }

    list.innerHTML = filtered.map(note => `
        <div class="note">
            <div class="note-header">
                <div>
                    <div class="note-title">${note.title}</div>
                    <div class="flashcard-subject" style="margin-top: 5px;">${note.subject}</div>
                </div>
                <button class="delete-btn" onclick="deleteNote(${note.id})">Delete</button>
            </div>
            <div class="note-content">${note.content}</div>
        </div>
    `).join('');
}

// Delete note
async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        await apiRequest(`/notes/${id}`, {
            method: 'DELETE'
        });

        data.notes = data.notes.filter(n => n.id !== id);
        updateNotesList();
    } catch (error) {
        alert('Failed to delete note: ' + error.message);
    }
}

// Update filter dropdowns
function updateFilters() {
    const subjects = [...new Set([
        ...data.flashcards.map(f => f.subject),
        ...data.notes.map(n => n.subject)
    ])];

    const flashcardFilter = document.getElementById('flashcardFilter');
    const notesFilter = document.getElementById('notesFilter');

    const options = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    
    flashcardFilter.innerHTML = '<option value="all">All Subjects</option>' + options;
    notesFilter.innerHTML = '<option value="all">All Subjects</option>' + options;
}

// Filter functions
function filterFlashcards() {
    updateFlashcardsList();
}

function filterNotes() {
    updateNotesList();

}
