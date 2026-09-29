// lib/apiBaseUrl.js

// API Configuration from environment variables
const SERVER = process.env.SERVER;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

export const API_BASE_URL = `${SERVER}/api/method/`;

export function getApiHeaders() {
    if (!API_KEY || !API_SECRET) {
        console.error('Missing API credentials in environment variables');
        throw new Error('API credentials not configured');
    }

    const headers = new Headers();
    headers.append('Authorization', `token ${API_KEY}:${API_SECRET}`);
    headers.append('Content-Type', 'application/json');
    return headers;
}

// Optional: Helper function to check if API is configured
export function isApiConfigured() {
    return !!(API_KEY && API_SECRET);
}