const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const keys = require('./keys/aws_key.json');
const fs = require('fs');
const path = require("path");

const s3 = new S3Client({
    region: 'us-west-2',
    credentials: keys
});

function upload(bucket, file, content_type) {
    return new Promise((resolve, reject) => {
        const data = fs.readFileSync(file);
        s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: path.basename(file),
            ContentType: content_type,
            Body: data
        })).then((res) => {
            let url = "https://" + bucket + ".s3.us-west-2.amazonaws.com/" + path.basename(file);
            console.log("Uploaded: " + url);
            resolve(url);
        }).catch((err) => {
            console.error(err);
            reject(err);
        });
    });
}
exports.upload = upload;