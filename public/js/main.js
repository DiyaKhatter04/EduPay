// EduConnect Platform - Main JavaScript
// Handles common functionality across all pages

// ---------------------------
// Global variables
// ---------------------------
let socket;
let user = null;

// ---------------------------
// Initialize App
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    getUserInfo();
    initializeSocket();
    setupEventListeners();
    setupFormValidation();
    enhanceForms();
    initializeAnimations();
    console.log('🚀 EduConnect app initialized');
}

// ---------------------------
// User Info
// ---------------------------
function getUserInfo() {
    const userMeta = document.querySelector('meta[name="user-info"]');
    if (userMeta) {
        try {
            user = JSON.parse(userMeta.content);
        } catch (e) {
            console.log('No user info available');
        }
    }
}

// ---------------------------
// Socket.io Initialization
// ---------------------------
function initializeSocket() {
    if (typeof io === 'undefined') return;

    socket = io();

    socket.on('connect', () => {
        console.log('🔌 Connected to server');
        if (user?.role) socket.emit('join-room', user.role);
    });

    socket.on('disconnect', () => console.log('🔌 Disconnected from server'));

    if (user) setupSocketListeners();
}

function setupSocketListeners() {
    if (!socket || !user) return;

    socket.on('system-notification', data => showNotification(data.title, data.message, data.type || 'info'));

    switch (user.role) {
        case 'student': setupStudentSocketListeners(); break;
        case 'donor': setupDonorSocketListeners(); break;
        case 'admin': setupAdminSocketListeners(); break;
    }
}

function setupStudentSocketListeners() {
    socket.on('new-donor-offering', data => {
        showNotification('🎁 New Donation Available!', `${data.type}: ${data.description}`, 'success');
        updateLiveIndicator();
        if (typeof updateDonationsList === 'function') updateDonationsList();
    });

    socket.on('request-fulfilled', data => {
        showNotification('✅ Request Fulfilled!', `Your ${data.type} request has been fulfilled.`, 'success');
    });
}

function setupDonorSocketListeners() {
    socket.on('new-student-request', data => {
        showNotification('📚 New Student Request', `${data.type}: ${data.description} (Priority: ${data.urgencyLevel})`, 'info');
        updateLiveIndicator();
    });

    socket.on('donation-claimed', data => {
        showNotification('🤝 Donation Claimed!', `Student #${data.studentId} claimed your donation.`, 'success');
    });
}

function setupAdminSocketListeners() {
    socket.on('new-user-registration', data => {
        showNotification('👤 New User Registered', `${data.role}: ${data.username} (ID: ${data.uniqueId})`, 'info');
    });

    socket.on('new-payment', data => {
        showNotification('💰 New Payment Received', `$${data.amount} from Donor #${data.donorId}`, 'info');
    });
}

// ---------------------------
// Event Listeners
// ---------------------------
function setupEventListeners() {
    // Mobile menu
    const toggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => navLinks.classList.toggle('mobile-open'));
    }

    // Close modals
    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) closeModal(e.target);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) closeModal(openModal);
        }
    });

    // Auto-dismiss alerts
    setTimeout(() => {
        document.querySelectorAll('.alert').forEach(alert => {
            alert.classList.add('fade-out');
            setTimeout(() => alert.remove(), 500);
        });
    }, 5000);
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// ---------------------------
// Form Validation
// ---------------------------
function setupFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', e => { if (!validateForm(form)) e.preventDefault(); });

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    });
}

function validateForm(form) {
    let valid = true;
    form.querySelectorAll('input[required], textarea[required], select[required]').forEach(input => {
        if (!validateField(input)) valid = false;
    });
    return valid;
}

function validateField(field) {
    const value = field.value.trim();
    const required = field.hasAttribute('required');
    clearFieldError(field);

    if (required && !value) { showFieldError(field, 'This field is required'); return false; }

    if (field.type === 'email' && value && !isValidEmail(value)) { showFieldError(field, 'Invalid email'); return false; }
    if (field.type === 'password' && value && value.length < 6) { showFieldError(field, 'Password must be 6+ chars'); return false; }
    
    if (field.type === 'number') {
        const num = parseFloat(value);
        if (value && isNaN(num)) { showFieldError(field, 'Invalid number'); return false; }
        if (!isNaN(field.min) && num < field.min) { showFieldError(field, `Min ${field.min}`); return false; }
        if (!isNaN(field.max) && num > field.max) { showFieldError(field, `Max ${field.max}`); return false; }
    }

    const pattern = field.getAttribute('pattern');
    if (pattern && value && !new RegExp(pattern).test(value)) {
        showFieldError(field, field.getAttribute('title') || 'Invalid value');
        return false;
    }

    return true;
}

function showFieldError(field, message) {
    field.classList.add('error');
    const existing = field.parentElement.querySelector('.field-error');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'field-error';
    div.textContent = message;
    field.parentElement.appendChild(div);
}

function clearFieldError(field) {
    field.classList.remove('error');
    const error = field.parentElement.querySelector('.field-error');
    if (error) error.remove();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------
// Form Enhancements
// ---------------------------
function enhanceForms() {
    // Floating labels
    document.querySelectorAll('.form-group.floating input, .form-group.floating textarea').forEach(input => {
        if (input.value) input.parentElement.classList.add('focused');
        input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
        input.addEventListener('blur', () => { if (!input.value) input.parentElement.classList.remove('focused'); });
    });

    // Auto-grow textareas
    document.querySelectorAll('textarea[data-auto-grow]').forEach(ta => {
        ta.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 300) + 'px';
        });
    });

    // File preview
    document.querySelectorAll('input[type="file"][data-preview]').forEach(input => {
        input.addEventListener('change', () => handleFilePreview(input));
    });
}

function handleFilePreview(input) {
    const files = Array.from(input.files);
    const container = document.querySelector(input.dataset.preview);
    if (!container) return;
    container.innerHTML = '';
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.margin = '4px';
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
}

// ---------------------------
// Animations
// ---------------------------
function initializeAnimations() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-animate], .card, .stat-card').forEach(el => observer.observe(el));

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ---------------------------
// Loading Bar
// ---------------------------
function showLoadingBar() {
    let bar = document.querySelector('.loading-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'loading-bar';
        bar.innerHTML = '<div class="loading-bar-progress"></div>';
        document.body.appendChild(bar);
    }
    bar.style.display = 'block';
    bar.querySelector('.loading-bar-progress').style.width = '0%';
    setTimeout(() => { bar.querySelector('.loading-bar-progress').style.width = '100%'; }, 100);
}

function hideLoadingBar() {
    const bar = document.querySelector('.loading-bar');
    if (bar) setTimeout(() => { bar.style.display = 'none'; }, 500);
}

// ---------------------------
// Notifications
// ---------------------------
function showNotification(title, message, type = 'info') {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '1rem';
        container.style.right = '1rem';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon"><i class="fas fa-${getNotificationIcon(type)}"></i></div>
            <div class="notification-text"><h4>${title}</h4><p>${message}</p></div>
            <button class="notification-close">&times;</button>
        </div>
    `;
    container.appendChild(notification);

    notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);

    playNotificationSound(type);
}

function getNotificationIcon(type) {
    return { 'success': 'check-circle', 'error': 'exclamation-circle', 'warning': 'exclamation-triangle', 'info': 'info-circle' }[type] || 'info-circle';
}

function playNotificationSound(type) {
    if (localStorage.getItem('notificationSound') === 'false') return;
    try {
        const audio = new Audio();
        audio.src = type === 'success' ? '/sounds/success.mp3' : type === 'error' ? '/sounds/error.mp3' : '/sounds/notification.mp3';
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch { console.log('Audio not available'); }
}

// ---------------------------
// Live Indicator
// ---------------------------
function updateLiveIndicator() {
    document.querySelectorAll('.live-indicator').forEach(indicator => {
        indicator.style.animation = 'pulse 1s ease-in-out 3';
        setTimeout(() => indicator.style.animation = '', 3000);
    });
}

// ---------------------------
// Utility functions
// ---------------------------
function debounce(func, wait) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        if (!inThrottle) { func.apply(this, arguments); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
    };
}

function saveToStorage(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; } }
function loadFromStorage(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function formatCurrency(amount) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount); }
function formatDate(date) { return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date)); }
function formatRelativeTime(date) { 
    const diff = Math.abs(new Date() - new Date(date));
    const days = Math.ceil(diff / (1000*60*60*24));
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.ceil(days/7)} weeks ago`;
    return `${Math.ceil(days/30)} months ago`;
}

// ---------------------------
// Export for external use
// ---------------------------
window.EduConnect = {
    showNotification, updateLiveIndicator, formatCurrency, formatDate, formatRelativeTime,
    saveToStorage, loadFromStorage, debounce, throttle, showLoadingBar, hideLoadingBar
};
// Example: animate social icons on hover
document.querySelectorAll('.social-link').forEach(link => {
    link.addEventListener('mouseenter', () => {
        link.style.transform = 'scale(1.2)';
        link.style.transition = 'transform 0.3s ease';
    });
    link.addEventListener('mouseleave', () => {
        link.style.transform = 'scale(1)';
    });
});
