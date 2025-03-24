document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logreg = document.getElementById('logreg');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const returnLogin = document.getElementById('return-login');
    const returnRegister = document.getElementById('return-register');


    loginFormContainer.classList.add('hidden');
    registerFormContainer.classList.add('hidden');

    registerFormContainer.style.marginTop = '-1000px';
    loginFormContainer.style.marginTop = '-1000px';


    loginBtn.addEventListener('click', function() {
        logreg.style.display = 'none';
        loginFormContainer.style.marginTop = '0px';
        loginFormContainer.classList.remove('hidden');
        loginFormContainer.classList.add('show');
    });

    registerBtn.addEventListener('click', function() {
        logreg.style.display = 'none';
        registerFormContainer.style.marginTop = '0px';
        registerFormContainer.classList.remove('hidden');
        registerFormContainer.classList.add('show');
        document.body.style.overflow = 'auto';
    });

    returnLogin.addEventListener('click', () => {
        loginFormContainer.classList.remove('show');
        loginFormContainer.classList.add('hidden');
        logreg.style.display = 'flex';
        loginFormContainer.style.marginTop = '-1000px';
    });

    returnRegister.addEventListener('click', () => {
        registerFormContainer.classList.remove('show');
        registerFormContainer.classList.add('hidden');
        logreg.style.display = 'flex';
        registerFormContainer.style.marginTop = '-1000px';
    });


    /* USER LOGIN */
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', (x) => {
        x.preventDefault();
        const formData = new FormData(loginForm);

        fetch(loginForm.action, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else if (data.status === 'success') {
                window.location.href = data.redirect_url;
            }
        })
        .catch(error => console.error('Error:', error));
    });


    /* REGISTER USER */
    const regForm = document.getElementById('register-form');
    const regBtn = document.getElementById('register-go-btn');

    regBtn.disabled = true;

    let emailTimeout; // Variable to hold the setTimeout
    let passTimeout;
    let confirmTimeout;

    document.getElementById('register-email').addEventListener('input', () => {
        const email = document.getElementById('register-email').value;
        const emailError = document.getElementById('email-error');

        const emailPattern = /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        clearTimeout(emailTimeout);

        if (email.length >= 5 && !emailPattern.test(email)) {
            emailTimeout = setTimeout(() => {
                emailError.textContent = 'The Given Email Is Invalid';
            }, 2000);
        } else if (email.length === 0 || emailPattern.test(email)) {
            emailError.textContent = '';
        }

        toggleRegBtn();

    });

    document.getElementById('register-password').addEventListener('input', () => {
        const password = document.getElementById('register-password').value;
        const passInput = document.getElementById('register-password');

        const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/;

        clearTimeout(passTimeout); // Clear the previous timeout if it's still pending

        if (password.length >= 8 && !passwordPattern.test(password)) {
            passTimeout = setTimeout(() => {
                alert('Password must be at least 8 characters long, include an uppercase letter, a number, and a lowercase letter.');
                passInput.value = '';
            }, 2000);
        }
        
        toggleRegBtn();

    });

    document.getElementById('register-confirm-pass').addEventListener('input', () => {
        const password = document.getElementById('register-password').value;
        const confirmPass = document.getElementById('register-confirm-pass').value;
        const confirmError = document.getElementById('confirm-error');

        clearTimeout(confirmTimeout); 
    
        if (confirmPass.length >= 8 && password !== confirmPass) {
            confirmTimeout = setTimeout(() => {
                confirmError.textContent = 'Passwords do not match';
            }, 2000);
        } else {
            confirmError.textContent = '';
        }
    
        toggleRegBtn();
    });    

    function toggleRegBtn() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPass = document.getElementById('register-confirm-pass').value;

        const emailPattern = /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/;


        if (emailPattern.test(email) && passwordPattern.test(password) && (password === confirmPass)) {
            regBtn.disabled = false;
        } else {
            regBtn.disabled = true;
        }
    }

    regForm.addEventListener('submit', (x) => {
        x.preventDefault();
        const formData = new FormData(regForm);

        fetch('/user-registration', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else if (data.status === 'success') {
                regForm.reset();
                window.location.href = '/';
            }
        })
        .catch(error => console.error('Error:', error));
    });

});

