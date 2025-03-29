// Configuration file for server connection

// The ngrok URL for the server
const NGROK_URL = "https://7e8c-2405-201-300c-7d-bd9c-7aa-87e7-d974.ngrok-free.app";

// Whether to use the ngrok URL (true) or local server (false)
const USE_NGROK = true;

/**
 * Get the server URL to use for connections
 * @returns {string} The server URL to use
 */
function getServerUrl() {
    if (USE_NGROK) {
        return NGROK_URL;
    } else {
        // Use local server with explicit port
        return 'http://' + window.location.hostname + ':3000';
    }
}

// Expose to window object
if (typeof window !== 'undefined') {
    window.serverConfig = {
        getServerUrl,
        NGROK_URL,
        USE_NGROK
    };
    console.log('Server configuration loaded. Using ' + (USE_NGROK ? 'ngrok URL' : 'local server'));
} 