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

// Store connected clients with unique client_ids
const clients = new Map();


// Function to broadcast data to specific client
function broadcastData(clientclient_id, data) {
    if (clients.has(clientclient_id)) {
        const client = clients.get(clientclient_id);
        client.send(data);
    }
}

// WebSocket server connection event
wss.on('connection', (ws) => {

    // WebSocket message event
    ws.on('message', async (message) => {
        // Handle incoming data from clients
        const data = JSON.parse(message);
        const { client_id, base64, file_id } = data;
        clients.set(client_id, ws);

        console.log(`Client ${client_id} connected.`);

        try {

            // Extract images from PDF
            let res = await axios.post('https://ap3ato5ql6nnr5rkwrrlpo33di0xmves.lambda-url.ap-south-1.on.aws/api/v1/pdf/extract/images', {
                base64: base64
            })
            let images = res.data.images;

            // Upload images to S3
            for (let i = 0; i < images.length; i++) {
                let image = images[i];
                let url = await uploadToS3(image, client_id, file_id);
                // Broadcast data to client
                broadcastData(client_id, JSON.stringify({
                    client_id: client_id,
                    url: url,
                    total: images.length
                }));
            }
            ws.close();
        } catch (error) {
            console.error('Error parsing message:', error);
            broadcastData(client_id, JSON.stringify({
                client_id: client_id,
                error: 'Error parsing message'
            }));
        }


    });

    // WebSocket close event
    ws.on('close', () => {
        console.log('Connection to the WebSocket server closed.')
    });
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


// module.exports = app;