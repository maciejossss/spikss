const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ModuleErrorHandler = require('./shared/error/ModuleErrorHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let logs = [];

// Przechwytywanie logów
ModuleErrorHandler.logger.on('data', (log) => {
    const logEntry = `${new Date().toISOString()} [${log.level}] ${log.message}`;
    logs.push(logEntry);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(logEntry);
        }
    });
});

// Dodajemy middleware do logowania odpowiedzi
app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function(data) {
        const logEntry = `${new Date().toISOString()} [RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode} - ${typeof data === 'string' ? data : JSON.stringify(data)}`;
        logs.push(logEntry);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(logEntry);
            }
        });
        oldSend.apply(res, arguments);
    };
    next();
});

// Serwowanie strony monitora
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Monitor Systemu</title>
            <style>
                body { font-family: monospace; background: #1e1e1e; color: #fff; margin: 20px; }
                #logs { 
                    background: #000; 
                    padding: 10px; 
                    height: 80vh; 
                    overflow-y: auto;
                    border-radius: 5px;
                }
                .error { color: #ff5555; }
                .warn { color: #ffb86c; }
                .info { color: #8be9fd; }
                .debug { color: #50fa7b; }
                .response { color: #bd93f9; }
            </style>
        </head>
        <body>
            <h2>Monitor Systemu Serwisowego - Logi na żywo</h2>
            <div id="logs"></div>
            <script>
                const logsDiv = document.getElementById('logs');
                const ws = new WebSocket('ws://' + window.location.host);
                
                ws.onmessage = (event) => {
                    const log = event.data;
                    const logElement = document.createElement('div');
                    
                    if (log.includes('[ERROR]')) {
                        logElement.className = 'error';
                    } else if (log.includes('[WARN]')) {
                        logElement.className = 'warn';
                    } else if (log.includes('[INFO]')) {
                        logElement.className = 'info';
                    } else if (log.includes('[DEBUG]')) {
                        logElement.className = 'debug';
                    } else if (log.includes('[RESPONSE]')) {
                        logElement.className = 'response';
                    }
                    
                    logElement.textContent = log;
                    logsDiv.appendChild(logElement);
                    logsDiv.scrollTop = logsDiv.scrollHeight;
                };

                ws.onclose = () => {
                    const logElement = document.createElement('div');
                    logElement.className = 'error';
                    logElement.textContent = new Date().toISOString() + ' [ERROR] Utracono połączenie z monitorem';
                    logsDiv.appendChild(logElement);
                };
            </script>
        </body>
        </html>
    `);
});

// Obsługa połączeń WebSocket
wss.on('connection', (ws) => {
    // Wysyłamy historię logów do nowego klienta
    logs.forEach(log => ws.send(log));
});

const PORT = process.env.MONITOR_PORT || 8090;
server.listen(PORT, () => {
    console.log(`Monitor uruchomiony na porcie ${PORT}`);
}); 