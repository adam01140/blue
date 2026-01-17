// Authentication System
// This script protects all pages and only needs to be included once

(function() {
    'use strict';
    
    // Configuration
    const AUTH_TOKEN_KEY = 'formstar_auth_token';
    const AUTH_EXPIRY_KEY = 'formstar_auth_expiry';
    const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const VERIFY_PASSWORD_ENDPOINT = '/api/verify-password';
    
    // Check if we're already on the login page
    const currentPage = window.location.pathname.split('/').pop();
    const isLoginPage = currentPage === 'login.html' || currentPage.endsWith('login.html');
    
    // Calculate path to login page based on current location
    function getLoginPagePath() {
        // Check if we're using file:// protocol
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            // For file:// protocol, calculate relative path based on current HTML file location
            // login.html is always in the /public/ directory
            // We need to find where we are relative to /public/
            const currentHref = window.location.href;
            const publicIndex = currentHref.indexOf('/public/');
            
            if (publicIndex !== -1) {
                // Extract the path after /public/
                const pathAfterPublic = currentHref.substring(publicIndex + '/public/'.length);
                // Remove the HTML filename
                const pathParts = pathAfterPublic.split('/').filter(p => p && !p.endsWith('.html'));
                // Calculate how many directories deep we are from /public/
                const depth = pathParts.length;
                // Build relative path (go up to public folder, then login.html)
                return depth > 0 ? '../'.repeat(depth) + 'login.html' : 'login.html';
            } else {
                // Fallback: assume we're one level deep (most common case)
                return '../login.html';
            }
        } else {
            // For http/https protocols, use the original logic
        const path = window.location.pathname;
        // Split path and filter out empty strings and the HTML file
        const parts = path.split('/').filter(p => p && !p.endsWith('.html'));
        // Count directories (depth from root)
        const depth = Math.max(0, parts.length);
        // Build relative path (go up to public folder, then login.html)
        // If depth is 0, we're at root, so just 'login.html'
        // If depth is 1, we're in a subfolder, so '../login.html'
        return depth > 0 ? '../'.repeat(depth) + 'login.html' : 'login.html';
        }
    }
    
    // Function to check if user is authenticated
    function isAuthenticated() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
        
        if (!token || !expiry) {
            return false;
        }
        
        // Check if session has expired
        const now = new Date().getTime();
        if (now > parseInt(expiry)) {
            // Session expired, clear storage
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_EXPIRY_KEY);
            return false;
        }
        
        return true;
    }
    
    // Function to set authentication
    function setAuthenticated() {
        const now = new Date().getTime();
        const expiry = now + SESSION_DURATION;
        
        // Create a simple token (in a real app, this would be more secure)
        const token = btoa('authenticated_' + now);
        
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
    }
    
    // Function to clear authentication (logout)
    function clearAuthentication() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_EXPIRY_KEY);
    }
    
    // Function to get redirect URL from query parameter
    function getRedirectUrl() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect) {
            // For file:// protocol, the redirect should already be relative to /public/
            // (set by redirectToLogin), so we can use it directly
            const isFileProtocol = window.location.protocol === 'file:';
            if (isFileProtocol && redirect.includes('/public/')) {
                // If it somehow still contains /public/, extract the path after it
                const publicIndex = redirect.indexOf('/public/');
                const pathAfterPublic = redirect.substring(publicIndex + '/public/'.length);
                // Remove any leading slashes
                return pathAfterPublic.replace(/^\/+/, '');
            }
            // For file://, the redirect should be a relative path like "Pages/account.html"
            // For http/https, it might be an absolute path like "/Pages/account.html"
            return redirect;
        }
        // Default to index.html (login.html is in /public/, so index.html is there too)
        return 'index.html';
    }
    
    // Function to redirect to login with current page as redirect
    function redirectToLogin() {
        const isFileProtocol = window.location.protocol === 'file:';
        let currentUrl;
        
        if (isFileProtocol) {
            // For file://, extract path relative to /public/ since login.html is also in /public/
            const currentHref = window.location.href;
            const publicIndex = currentHref.indexOf('/public/');
            if (publicIndex !== -1) {
                // Extract path after /public/ (this will be relative to login.html's location)
                const pathAfterPublic = currentHref.substring(publicIndex + '/public/'.length);
                // Remove query string if present before extracting path
                const pathOnly = pathAfterPublic.split('?')[0];
                const queryString = window.location.search;
                // Store as path relative to /public/ (without leading slash)
                currentUrl = pathOnly + queryString;
            } else {
                // Fallback
                currentUrl = window.location.pathname + window.location.search;
            }
        } else {
            currentUrl = window.location.pathname + window.location.search;
        }
        
        const loginPagePath = getLoginPagePath();
        const loginUrl = loginPagePath + '?redirect=' + encodeURIComponent(currentUrl);
        // Use replace instead of href to prevent back button from accessing protected page
        window.location.replace(loginUrl);
    }
    
    // Function to verify password with server
    async function verifyPassword(password) {
        try {
            console.log('Verifying password with server...');
            const response = await fetch(VERIFY_PASSWORD_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: password.trim() })
            });
            
            if (!response.ok) {
                console.error('Server response not OK:', response.status, response.statusText);
                const errorData = await response.json().catch(() => ({}));
                console.error('Error data:', errorData);
                return false;
            }
            
            const data = await response.json();
            console.log('Server response:', data);
            return data.success === true;
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }
    
    // Expose authentication functions for login page (must be available even on login page)
    window.auth = {
        checkPassword: verifyPassword, // Now uses server-side verification
        setAuthenticated: setAuthenticated,
        getRedirectUrl: getRedirectUrl,
        clearAuthentication: clearAuthentication
    };
    
    // Expose logout function globally
    window.logout = function() {
        clearAuthentication();
        window.location.href = getLoginPagePath();
    };
    
    // Only check authentication if NOT on login page
    if (!isLoginPage) {
        // Check authentication immediately (runs as soon as script loads)
        // This runs synchronously when the script is included in <head>
        // Must check before any page content loads
        try {
            if (!isAuthenticated()) {
                // Redirect immediately - this will stop page rendering
                redirectToLogin();
            }
        } catch (e) {
            // If there's any error, still redirect to login for security
            console.error('Auth check error:', e);
            try {
                window.location.replace(getLoginPagePath());
            } catch (e2) {
                // Last resort - try href
                window.location.href = getLoginPagePath();
            }
        }
    }
})();

