const WebSocket = require('ws');
const { default: axios } = require('axios');
const { uploadToS3 } = require('./lib/utils');
const express = require('express');
const http = require('http');
// const serverless = require('serverless-http');


const app = express();
const server = http.createServer(app);

// Test route
app.get('/', (req, res) => {
    res.send('Hello from goPdf')
});

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with unique IDs
const clients = new Map();


// Function to broadcast data to specific client
function broadcastData(clientId, data) {
    if (clients.has(clientId)) {
        const client = clients.get(clientId);
        client.send(data);
    }
}

// WebSocket server connection event
wss.on('connection', (ws) => {

    // WebSocket message event
    ws.on('message', async (message) => {
        // Handle incoming data from clients
        const data = JSON.parse(message);
        const { id, base64 } = data;
        clients.set(id, ws);

        console.log(`Client ${id} connected.`);

        try {

            // Extract images from PDF
            let res = await axios.post('https://ap3ato5ql6nnr5rkwrrlpo33di0xmves.lambda-url.ap-south-1.on.aws/api/v1/pdf/extract/images', {
                base64: base64
            })
            let images = res.data.images;

            // Upload images to S3
            for (let i = 0; i < images.length; i++) {
                let image = images[i];
                let url = await uploadToS3(image, id);
                // Broadcast data to client
                broadcastData(id, JSON.stringify({
                    id: id,
                    url: url,
                    total: images.length
                }));
            }
            ws.close();
        } catch (error) {
            console.error('Error parsing message:', error);
            broadcastData(id, JSON.stringify({
                id: id,
                error: 'Error parsing message'
            }));
        }


    });

    // WebSocket close event
    ws.on('close', () => {
        console.log('Connection to the WebSocket server closed.')
    });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


// module.exports.handler = serverless(app);