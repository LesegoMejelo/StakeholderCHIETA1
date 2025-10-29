import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDP43thmAHRibCEbFcBZx2vpA2mEPDByz8",
    authDomain: "stakeholder-app-57ed0.firebaseapp.com",
    projectId: "stakeholder-app-57ed0",
    storageBucket: "stakeholder-app-57ed0.appspot.com",
    messagingSenderId: "988521434771",
    appId: "1:988521434771:web:d189e963a8c41909a2c766"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const submitButton = document.getElementById("btnSignin");
    const statusMsg = document.getElementById("statusMsg");

    try {
        // Show loading state
        const originalText = submitButton.textContent;
        submitButton.textContent = "Logging in...";
        submitButton.disabled = true;
        statusMsg.textContent = "Signing you in...";
        statusMsg.className = "helper";

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();

        console.log("Firebase login successful, UID:", userCredential.user.uid);
        statusMsg.textContent = "Authentication successful, verifying...";

        const response = await fetch("/Auth/Login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: new URLSearchParams({ idToken: token })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log("Backend login successful, redirecting to:", data.redirectUrl);
            statusMsg.textContent = "Login successful! Redirecting...";
            statusMsg.className = "helper success";
            setTimeout(() => {
                window.location.href = data.redirectUrl;
            }, 1000);
        } else {
            console.error("Backend login failed:", data);
            statusMsg.textContent = "Login failed: " + (data.message || "Unknown error");
            statusMsg.className = "helper error";
            // Sign out from Firebase if backend login fails
            await auth.signOut();
        }
    } catch (error) {
        console.error("Login error:", error);
        statusMsg.textContent = "Login error: " + error.message;
        statusMsg.className = "helper error";
    } finally {
        // Reset button state
        submitButton.textContent = "Continue";
        submitButton.disabled = false;
    }
});

// Cancel button handler
document.getElementById('btnCancel')?.addEventListener('click', () => {
    loginForm.reset();
    document.getElementById('statusMsg').textContent = '';
});

// Settings menu functionality
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
if (settingsBtn && settingsMenu) {
    const toggle = () => {
        const open = !settingsMenu.hasAttribute('hidden');
        if (open) {
            settingsMenu.setAttribute('hidden', '');
            settingsBtn.setAttribute('aria-expanded', 'false');
        } else {
            settingsMenu.removeAttribute('hidden');
            settingsBtn.setAttribute('aria-expanded', 'true');
        }
    };
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
    });
    document.addEventListener('click', () => {
        if (!settingsMenu.hasAttribute('hidden')) {
            settingsMenu.setAttribute('hidden', '');
            settingsBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

// Remove the conflicting redirection code at the bottom