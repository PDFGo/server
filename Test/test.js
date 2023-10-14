const WebSocket = require('ws');
const fs = require('fs');
const base64EncodeStream = require('base64-encode-stream');

function convertPdfToBase64(filePath) {
  return new Promise((resolve, reject) => {
    const base64Stream = fs.createReadStream(filePath).pipe(base64EncodeStream());
    let base64Data = '';

    base64Stream.on('data', (chunk) => {
      base64Data += chunk.toString();
    });

    base64Stream.on('end', () => {
      resolve(base64Data);
    });

    base64Stream.on('error', (error) => {
      reject(error);
    });
  });
}

// Function to generate a random ID for clients
function generateClientId() {
  return Math.random().toString(36).substr(2, 8);
}

// const ws = new WebSocket('wss://gopdf-server.onrender.com');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to the WebSocket server.');

  // Register the client with a unique ID on the server
  const clientId = generateClientId();
  const fileId = generateClientId();
  convertPdfToBase64('./test.pdf').then((base64) => {
    const registerData = { base64: base64, client_id: clientId, file_id: fileId };
    console.log(registerData);
    ws.send(JSON.stringify(registerData));
  }).catch((error) => {
    console.error('Error converting PDF to base64:', error);
  }
  );
});

ws.on('message', (message) => {
  try {
    const data = JSON.parse(message);
    // Handle incoming data from the server
    console.log(data);
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('Connection to the WebSocket server closed.');
});
