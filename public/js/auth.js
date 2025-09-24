// EduConnect Authentication JavaScript
// Handles login/register form functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    setupPasswordToggle();
    setupFormValidation();
    setupRoleSelection();
    setupDemoAccounts();
    console.log('🔐 Auth system initialized');
}

// Password visibility toggle
function setupPasswordToggle() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
                this.setAttribute('aria-label', 'Hide password');
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
                this.setAttribute('aria-label', 'Show password');
            }
        });
    });
}

// Form validation
function setupFormValidation() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) setupLoginValidation(loginForm);
    if (registerForm) setupRegisterValidation(registerForm);
}

function setupLoginValidation(form) {
    const submitBtn = form.querySelector('.auth-submit-btn');
    form.addEventListener('submit', function(e) {
        showSubmitLoading(submitBtn);
        const username = form.username.value.trim();
        const password = form.password.value;
        if (!username || !password || password.length < 6) {
            e.preventDefault();
            hideSubmitLoading(submitBtn);
            showAlert(!username || !password ? 'Please fill in all fields' : 'Password must be at least 6 characters', 'error');
            return;
        }
    });
    form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
            validateAuthField(this);
            updateSubmitButton(form);
        });
    });
}

function setupRegisterValidation(form) {
    const submitBtn = form.querySelector('.auth-submit-btn');
    const passwordInput = form.password;
    const confirmPasswordInput = form.confirmPassword;
    form.addEventListener('submit', function(e) {
        if (!validateRegisterForm(form)) e.preventDefault();
        showSubmitLoading(submitBtn);
    });
    if (passwordInput) passwordInput.addEventListener('input', function() { updatePasswordStrength(this.value); checkPasswordMatch(); });
    if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    form.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('blur', function() { validateAuthField(this); });
        input.addEventListener('input', function() { clearFieldError(this); updateSubmitButton(form); });
    });
}

// Field validation functions
function validateRegisterForm(form) {
    let isValid = true;
    form.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => { if (!validateAuthField(field)) isValid = false; });
    const password = form.password.value;
    const confirmPassword = form.confirmPassword?.value;
    if (password !== confirmPassword) { showFieldError(form.confirmPassword, 'Passwords do not match'); isValid = false; }
    if (form.terms && !form.terms.checked) { showAlert('Please accept the terms and conditions', 'error'); isValid = false; }
    const role = form.role?.value;
    if (!role || !['student','donor'].includes(role)) { showAlert('Please select a valid role', 'error'); isValid = false; }
    return isValid;
}

function validateAuthField(field) {
    const value = field.value.trim(), name = field.name;
    clearFieldError(field);
    if (field.hasAttribute('required') && !value) { showFieldError(field, 'This field is required'); return false; }
    switch(name) {
        case 'username':
            if (value.length<3 || value.length>20) { showFieldError(field,'Username must be 3-20 characters'); return false; }
            if (!/^[a-zA-Z0-9_]+$/.test(value)) { showFieldError(field,'Username can only contain letters, numbers, and underscores'); return false; }
            break;
        case 'email':
            if (value && !isValidEmail(value)) { showFieldError(field,'Please enter a valid email address'); return false; }
            break;
        case 'password':
            if (value && value.length < 6) { showFieldError(field,'Password must be at least 6 characters'); return false; }
            break;
        case 'fullName':
            if (value && value.length < 2) { showFieldError(field,'Please enter your full name'); return false; }
            break;
    }
    return true;
}

// Password strength & matching
function updatePasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    if (!strengthBar || !strengthText) return;
    let strength=0, feedback=[];
    if(password.length>=8) strength+=25; else if(password.length>=6){strength+=10;feedback.push('Try a longer password');} else feedback.push('Too short');
    if(password.match(/[a-z]/)) strength+=15; else if(password.length>0) feedback.push('Add lowercase letters');
    if(password.match(/[A-Z]/)) strength+=15; else if(password.length>0) feedback.push('Add uppercase letters');
    if(password.match(/[0-9]/)) strength+=15; else if(password.length>0) feedback.push('Add numbers');
    if(password.match(/[^a-zA-Z0-9]/)) strength+=30; else if(password.length>0) feedback.push('Add special characters');
    strengthBar.style.width = Math.min(strength,100)+'%';
    let color,text;
    if(strength<30){color='#e74c3c';text='Weak';} else if(strength<60){color='#f39c12';text='Fair';} else if(strength<90){color='#f1c40f';text='Good';} else {color='#27ae60';text='Strong';}
    strengthBar.style.backgroundColor=color; strengthText.textContent=text; strengthText.style.color=color;
    strengthText.title = feedback.length>0 && password.length>0 ? 'Suggestions: '+feedback.join(', ') : '';
}

function checkPasswordMatch() {
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const matchDiv = document.getElementById('passwordMatch');
    if(!matchDiv || !confirmPassword) return;
    if(confirmPassword.length>0){
        if(password===confirmPassword){matchDiv.innerHTML='<i class="fas fa-check"></i> Passwords match'; matchDiv.className='password-match success';}
        else {matchDiv.innerHTML='<i class="fas fa-times"></i> Passwords do not match'; matchDiv.className='password-match error';}
    } else {matchDiv.innerHTML=''; matchDiv.className='password-match';}
}

// Role selection
function setupRoleSelection() {
    document.querySelectorAll('.role-option').forEach(option=>{
        option.addEventListener('click',()=>selectRole(option.dataset.role));
        option.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault(); selectRole(option.dataset.role);}});
    });
}

function selectRole(role){
    const roleSelection = document.getElementById('roleSelection');
    const registerForm = document.getElementById('registerForm');
    const selectedRoleInput = document.getElementById('selectedRole');
    document.querySelectorAll('.role-option').forEach(opt=>{opt.classList.remove('selected'); opt.setAttribute('aria-selected','false');});
    document.querySelector(`[data-role="${role}"]`).classList.add('selected');
    document.querySelector(`[data-role="${role}"]`).setAttribute('aria-selected','true');
    if(selectedRoleInput) selectedRoleInput.value=role;
    setTimeout(()=>{if(roleSelection) roleSelection.style.display='none'; if(registerForm){registerForm.style.display='block'; loadRoleSpecificFields(role); updateRegistrationTitle(role);}},300);
}

// Demo accounts
function setupDemoAccounts() {
    document.querySelectorAll('.demo-account').forEach(account=>{
        account.addEventListener('click',function(){
            const [username,password] = this.querySelector('small')?.textContent.split(' / ')||[];
            if(username && password) fillDemoCredentials(username,password);
        });
    });
}

function fillDemoCredentials(username,password){
    const usernameField=document.getElementById('username');
    const passwordField=document.getElementById('password');
    if(usernameField && passwordField){
        typeText(usernameField,username,()=>typeText(passwordField,password,()=>{
            [usernameField,passwordField].forEach(f=>{f.classList.add('demo-filled'); setTimeout(()=>f.classList.remove('demo-filled'),2000);});
        }));
    }
}

function typeText(element,text,callback){element.value=''; element.focus(); let i=0; const interval=setInterval(()=>{element.value+=text[i]; i++; if(i>=text.length){clearInterval(interval); element.blur(); if(callback) callback();}},100);}

// Helpers
function showSubmitLoading(btn){if(btn){btn.classList.add('loading'); btn.disabled=true;}}
function hideSubmitLoading(btn){if(btn){btn.classList.remove('loading'); btn.disabled=false;}}
function updateSubmitButton(form){
    const submitBtn=form.querySelector('.auth-submit-btn');
    let allValid=true;
    form.querySelectorAll('input[required], select[required], textarea[required]').forEach(f=>{if(!f.value.trim()) allValid=false;});
    if(submitBtn){submitBtn.disabled=!allValid; submitBtn.classList.toggle('ready',allValid);}
}
function showFieldError(field,msg){field.classList.add('error'); const existing=field.parentElement.querySelector('.field-error'); if(existing) existing.remove(); const div=document.createElement('div'); div.className='field-error'; div.innerHTML=`<i class="fas fa-exclamation-circle"></i> ${msg}`; field.parentElement.appendChild(div); setTimeout(()=>{field.scrollIntoView({behavior:'smooth',block:'center'});},100);}
function clearFieldError(field){field.classList.remove('error'); const div=field.parentElement.querySelector('.field-error'); if(div) div.remove();}
function isValidEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function showAlert(msg,type){if(window.EduConnect && window.EduConnect.showNotification){window.EduConnect.showNotification('Validation Error',msg,type); return;} const alert=document.createElement('div'); alert.className=`alert alert-${type}`; alert.innerHTML=`<div class="alert-content"><i class="fas fa-${type==='error'?'exclamation-circle':'check-circle'}"></i><span>${msg}</span><button class="alert-close" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button></div>`; document.body.appendChild(alert); setTimeout(()=>{if(alert.parentElement) alert.remove();},5000);}
