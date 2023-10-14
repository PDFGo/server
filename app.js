const WebSocket = require('ws');
const { default: axios } = require('axios');
const { uploadToS3, getFilesFromS3 } = require('./lib/utils');
const express = require('express');
const http = require('http');
// const serverless = require('serverless-http');
const cors = require('cors')


const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send('Hello from goPdf')
});

// get all files from S3 bucket
app.get('/view', (req, res) => {
    const { client_id, key } = req.query;
    getFilesFromS3(client_id, key).then((files) => {
        files = files.map((file) => {
            return {
                url: `https://pdf-expert.s3.ap-south-1.amazonaws.com/${file.Key}`,
                pdfKey: file.Key.split('/')[1],
                fileName: file.Key.split('/')[2],
                lastModified: file.LastModified,
                size: file.Size,
            }
        });
        res.json({
            files: files, query: {
                client_id: client_id,
                key: key
            }, total: files.length
        }
        );
    }).catch((error) => {
        console.error(error);
        res.send('Error fetching files from S3');

    });
});

app.post('/shorturl', (req, res) => {
    let data = JSON.stringify({
        "long_url": req.body.url,
    });
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api-ssl.bitly.com/v4/shorten',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ` + process.env.BITLY_TOKEN
        },
        data: data
    };

    axios.request(config)
        .then((response) => {
            // console.log(JSON.stringify(response.data));
            res.json({
                url: response.data.link,
                id: response.data.id
            });
        })
        .catch((error) => {
            console.log(error);
        });

})

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
            let res = await axios.post(process.env.SERVERLESS_URL, {
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