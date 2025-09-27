
    import {initializeApp} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
    import {getAuth, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

    const firebaseConfig = {
        apiKey: "AIzaSyDP43thmAHRibCEbFcBZx2vpA2mEPDByz8",
    authDomain: "stakeholder-app-57ed0.firebaseapp.com",
    projectId: "stakeholder-app-57ed0",
    storageBucket: "stakeholder-app-57ed0.appspot.com",
    messagingSenderId: "988521434771",
    appId: "1:988521434771:web:d189e963a8c41909a2c766"
        };

    (function(){
          const advisorBtn = document.getElementById('roleAdvisor');
    const stakeholderBtn = document.getElementById('roleStakeholder');
    const adminBtn = document.getElementById('roleAdmin');
    const roleHint = document.getElementById('roleHint');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const status = document.getElementById('statusMsg');
    const signin = document.getElementById('btnSignin');
    const cancel = document.getElementById('btnCancel');

    let role = 'Advisor'; // default

    function setRole(next){
        role = next;
    const isAdvisor = role === 'Advisor';
    const isStakeholder = role === 'Stakeholder';
    const isAdmin = role === 'Admin';
    advisorBtn.setAttribute('aria-pressed', isAdvisor ? 'true' : 'false');
    advisorBtn.setAttribute('aria-selected', isAdvisor ? 'true' : 'false');
    stakeholderBtn.setAttribute('aria-pressed', isStakeholder ? 'true' : 'false');
    stakeholderBtn.setAttribute('aria-selected', isStakeholder ? 'true' : 'false');
    if (adminBtn) {
        adminBtn.setAttribute('aria-pressed', isAdmin ? 'true' : 'false');
    adminBtn.setAttribute('aria-selected', isAdmin ? 'true' : 'false');
            }
    roleHint.innerHTML = 'You are signing in as <strong>' + role + '</strong>.';
          }

          advisorBtn.addEventListener('click', () => setRole('Advisor'));
          stakeholderBtn.addEventListener('click', () => setRole('Stakeholder'));
          if (adminBtn) adminBtn.addEventListener('click', () => setRole('Admin'));

          // Mock submit (replace with real POST or navigation)
          signin.addEventListener('click', () => {
        status.textContent = '';
    if(!email.value || !password.value){
        status.textContent = 'Please fill in both fields.';
    status.className = 'helper error';
    return;
            }
    status.textContent = 'Signing in as ' + role + '…';
    status.className = 'helper';

    // Example endpoints (replace with your routes)
    const endpoint = role === 'Advisor' ? '/Advisor/Login' : (role === 'Stakeholder' ? '/Stakeholder/Login' : '/Admin/Login');

            // Simulate success for demo
            setTimeout(() => {
        status.textContent = 'Success! Redirecting to ' + (role === 'Advisor' ? 'Advisor Dashboard' : (role === 'Stakeholder' ? 'Stakeholder Dashboard' : 'Admin Dashboard')) + '…';
    status.className = 'helper success';
            }, 600);
          });

          cancel.addEventListener('click', () => {
        email.value = '';
    password.value = '';
    status.textContent = '';
          });

    // Settings menu (if present in header)
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    if(settingsBtn && settingsMenu){
            const toggle = () => {
              const open = !settingsMenu.hasAttribute('hidden');
    if(open){settingsMenu.setAttribute('hidden', ''); settingsBtn.setAttribute('aria-expanded','false'); }
    else {settingsMenu.removeAttribute('hidden'); settingsBtn.setAttribute('aria-expanded','true'); }
            };
            settingsBtn.addEventListener('click', (e) => {e.stopPropagation(); toggle(); });
            document.addEventListener('click', () => { if(!settingsMenu.hasAttribute('hidden')) {settingsMenu.setAttribute('hidden', ''); settingsBtn.setAttribute('aria-expanded','false'); }});
          }
        })();


        // Redirection fallback: ensure we navigate on sign-in
        document.getElementById('btnSignin')?.addEventListener('click', () => {
          const role = (document.getElementById('roleAdmin')?.getAttribute('aria-pressed') === 'true') ? 'Admin' :
    (document.getElementById('roleStakeholder')?.getAttribute('aria-pressed') === 'true') ? 'Stakeholder' :
    'Advisor';
    const endpoint =
    role === 'Advisor'
    ? 'EmployeeView/EmployeeLandingPage/index.html'
    : role === 'Stakeholder'
    ? 'StakeholderView/StakeholderLandingPage/index.html'
    : 'EmployeeView/AdminDashboard/index.html';

    window.location.assign(endpoint);

        });

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    const loginForm = document.getElementById("loginForm");
        loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
                // Show loading state
                const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Logging in...";
    submitButton.disabled = true;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();

    console.log("Firebase login successful, UID:", userCredential.user.uid);

    const response = await fetch("/Auth/Login", {
        method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
                    },
    body: new URLSearchParams({idToken: token })
                });

    const data = await response.json();

    if (response.ok && data.success) {
        console.log("Backend login successful, redirecting to:", data.redirectUrl);
    window.location.href = data.redirectUrl;
                } else {
        console.error("Backend login failed:", data);
    alert("Login failed: " + (data.message || "Unknown error"));
    // Sign out from Firebase if backend login fails
    await auth.signOut();
                }
            } catch (error) {
        console.error("Login error:", error);
    alert("Login error: " + error.message);
            } finally {
                // Reset button state
                const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.textContent = originalText;
    submitButton.disabled = false;
            }
        });