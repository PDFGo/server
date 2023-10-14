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

// Function to generate random string
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
const uploadToS3 = async (image, client_id, file_id) => new Promise(async (resolve, reject) => {
    console.log({
        data: image.data.substring(0, 50),
        mimeType: image.mimeType,
        client_id,
        file_id
    })
    try {
        const buffer = Buffer.from(image.data, 'base64');
        const params = {
            Bucket: 'pdfgo',
            // path in s3
            Key: `${client_id}/${file_id
                }/${Date.now()}.${image.mimeType}`,
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

// Get all files from S3 bucket
const getFilesFromS3 = async (client_id, key) => new Promise(async (resolve, reject) => {
    try {
        const params = {
            Bucket: 'pdf-expert',
            // path in s3
            Prefix: `${client_id}/${key}/`
        };

        const response = await s3.listObjectsV2(params).promise();
        resolve(response.Contents);
    } catch (error) {
        console.error('Error getting files from S3:', error);
        reject(error);
    }
})

module.exports = {
    uploadToS3,
    getFilesFromS3,
}