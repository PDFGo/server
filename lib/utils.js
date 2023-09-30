const AWS = require('aws-sdk');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// AWS S3 configuration
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


const s3 = new AWS.S3();

const generateRandomString = (length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

// Function to upload data to S3 bucket
const uploadToS3 = async (base64Image, client_id) => new Promise(async (resolve, reject) => {
    try {
        const buffer = Buffer.from(base64Image, 'base64');
        const params = {
            Bucket: 'pdf-expert',
            Key: `${client_id}/${generateRandomString(10)
                }/${Date.now()}.jpeg`,
            Body: buffer,
            ContentType: 'text/plain',
        };

        const response = await s3.upload(params).promise();
        resolve(response.Location);
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        reject(error);
    }
})

module.exports = {
    uploadToS3
}