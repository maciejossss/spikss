/**
 * SERVER ENTRY POINT
 * Starts the modular application following rules.txt architecture
 */

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Application = require('./src/app');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Main function
async function main() {
    try {
        const app = new Application();
        const port = process.env.PORT || 8081;
        
        // Start the application
        await app.start(port);
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully...');
            await app.shutdown();
            process.exit(0);
        });
        
        process.on('SIGINT', async () => {
            console.log('SIGINT received, shutting down gracefully...');
            await app.shutdown();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Start the server
main(); 