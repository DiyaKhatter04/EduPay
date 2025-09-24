// EduConnect Socket.io Client
// Handles real-time communication and notifications

let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

document.addEventListener('DOMContentLoaded', initializeSocket);

function initializeSocket() {
    if (typeof io === 'undefined') return console.log('Socket.io not available');

    socket = io({
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts
    });

    setupSocketListeners();
    console.log('🔌 Socket.io initialized');
}

// ----------------- Socket Listeners -----------------
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connected:', socket.id);
        reconnectAttempts = 0;
        updateConnectionStatus(true);
        joinUserRoom();
        if (reconnectAttempts > 0) showNotification('Reconnected', 'Successfully reconnected', 'success');
    });

    socket.on('disconnect', reason => {
        console.log('❌ Disconnected:', reason);
        updateConnectionStatus(false);
        if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('reconnect_attempt', attempt => reconnectAttempts = attempt);
    socket.on('reconnect', attempt => console.log('🔄 Reconnected after', attempt, 'attempts'));
    socket.on('reconnect_error', err => console.log('❌ Reconnection failed:', err));
    socket.on('reconnect_failed', () => showNotification('Connection Lost', 'Cannot reconnect. Refresh page.', 'error'));

    setupRoleBasedListeners();
}

// ----------------- Role Management -----------------
function joinUserRoom() {
    const role = getUserRole();
    if (role) {
        socket.emit('join-room', role);
        console.log(`👥 Joined ${role} room`);
    }
}

function getUserRole() {
    const meta = document.querySelector('meta[name="user-role"]');
    if (meta) return meta.content;

    const path = window.location.pathname;
    if (path.includes('/student/')) return 'student';
    if (path.includes('/donor/')) return 'donor';
    if (path.includes('/admin/')) return 'admin';

    const bodyClass = document.body.className;
    if (bodyClass.includes('student')) return 'student';
    if (bodyClass.includes('donor')) return 'donor';
    if (bodyClass.includes('admin')) return 'admin';

    return null;
}

// ----------------- Role-Based Listeners -----------------
function setupRoleBasedListeners() {
    const role = getUserRole();
    if (!role) return;

    if (role === 'student') setupStudentListeners();
    else if (role === 'donor') setupDonorListeners();
    else if (role === 'admin') setupAdminListeners();

    setupCommonListeners();
}

function setupStudentListeners() {
    socket.on('new-donor-offering', data => {
        showRealTimeNotification({ title: '🎁 New Donation!', message: `${data.type}: ${data.description}`, type: 'success' });
        updateAvailableDonationsCount();
        if (window.location.pathname === '/student/dashboard') addDonationToPage(data);
    });

    socket.on('request-status-update', data => {
        showRealTimeNotification({ title: '📋 Request Update', message: `Your ${data.type} request is ${data.status}`, type: 'info' });
        updateRequestStatusOnPage(data.requestId, data.status);
    });

    socket.on('donation-claimed-success', data => {
        showRealTimeNotification({ title: '🎉 Donation Claimed!', message: `You claimed: ${data.description}`, type: 'success' });
        removeDonationFromPage(data.donationId);
        updateStats();
    });
}

function setupDonorListeners() {
    socket.on('new-student-request', data => {
        showRealTimeNotification({ title: '📚 New Student Request', message: `${data.type}: ${data.description}`, type: 'info' });
        if (window.location.pathname === '/donor/dashboard') addRequestToPage(data);
        updatePendingRequestsCount();
    });

    socket.on('donation-claimed', data => {
        showRealTimeNotification({ title: '🤝 Donation Claimed!', message: `Student #${data.studentId} claimed your donation`, type: 'success' });
        updateDonationStatusOnPage(data.donationId, 'claimed');
        updateStats();
    });

    socket.on('payment-processed', data => {
        showRealTimeNotification({ title: '💰 Payment Processed', message: `Payment $${data.amount} is ${data.status}`, type: data.status === 'approved' ? 'success' : 'info' });
    });
}

function setupAdminListeners() {
    socket.on('new-user-registration', data => {
        showRealTimeNotification({ title: '👤 New User Registered', message: `${data.role}: ${data.username}`, type: 'info' });
        updateUserCounts();
    });

    socket.on('new-payment', data => {
        showRealTimeNotification({ title: '💰 Payment Received', message: `$${data.amount} from Donor #${data.donorId}`, type: 'success' });
        updatePaymentStats();
    });
}

// ----------------- Common Listeners -----------------
function setupCommonListeners() {
    socket.on('system-notification', data => showRealTimeNotification(data));
    socket.on('maintenance-notice', data => showMaintenanceNotice(data));
    socket.on('stats-update', data => updatePageStats(data));
}

// ----------------- UI & Notifications -----------------
function updateConnectionStatus(connected) {
    document.querySelectorAll('.connection-status').forEach(ind => {
        ind.classList.toggle('connected', connected);
        ind.classList.toggle('disconnected', !connected);
        ind.innerHTML = connected ? '<i class="fas fa-wifi"></i> Connected' : '<i class="fas fa-wifi-slash"></i> Disconnected';
    });
}

function showRealTimeNotification({ title, message, type = 'info', details = '', action = null, duration = 8000 }) {
    const container = getNotificationContainer();
    const notif = document.createElement('div');
    notif.className = `real-time-notification ${type}`;
    notif.innerHTML = `<div class="notification-content"><div class="notification-header"><div class="notification-title">${title}</div><button class="notification-close" onclick="this.closest('.real-time-notification').remove()"><i class="fas fa-times"></i></button></div><div class="notification-body"><div class="notification-message">${message}</div>${details ? `<div class="notification-details">${details}</div>` : ''}</div></div>`;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
}

function getNotificationContainer() {
    let container = document.getElementById('real-time-notifications');
    if (!container) {
        container = document.createElement('div');
        container.id = 'real-time-notifications';
        document.body.appendChild(container);
    }
    return container;
}

// ----------------- Page Updates (simplified) -----------------
function addDonationToPage(data) { /* create & append donation card */ }
function addRequestToPage(data) { /* create & append request card */ }
function updateStats() { socket.emit('request-stats-update'); }
