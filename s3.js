const S3 = require("aws-sdk/clients/s3");
require("dotenv").config();
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const bucketName = process.env.S3_BUCKET;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

//supload to s3
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
  };

  return s3.upload(uploadParams).promise();
}

exports.uploadFile = uploadFile;

//downloads from s3
function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName,
  };

  return s3.getObject(downloadParams).createReadStream();
}

exports.getFileStream = getFileStream;

//upload multiple objects.
async function uploadObjects(files) {
  // create an object containing the name of the bucket, the key, body, and acl of the object.
  let uploadParams = {
    Bucket: bucketName,
    Body: "",
    Key: "",
  };

  // structure the return data.
  let objects = [];

  // loop through all the sent files.
  for (let i = 0; i < files.length; i++) {
    // Get that single file.
    let file = files[i];

    // From the file, get the read stream and the filename.
    let { createReadStream, filename } = await file;

    // read the data from the file.
    let stream = fs.createReadStream(file.path);

    // in case of any error, log it.
    stream.on("error", (error) => console.error(error));

    // assign the body of the object to the data to read.
    uploadParams.Body = stream;

    // get the current timestamp.
    let timestamp = new Date().getTime();

    // get the file extension.
    let file_extension = file.filename;

    // compose the key as the folder name, the timestamp, and the file extension of the object.
    uploadParams.Key = `${timestamp}${file_extension}`;

    // promisify the upload() function so that we can use async/await syntax.
    //let upload = s3.upload.bind(s3).promise();

    // upload the object.
    let result = await s3.upload(uploadParams).promise().catch(console.log);

    // push the structured response to the objects array.
    objects.push({
      key: uploadParams.Key,
      url: result.Location,
    });
    await unlinkFile(file.path);
  }

  // return the response to the client.
  return objects;
}
exports.uploadObjects = uploadObjects;

async function deleteObjects(objectKeys) {
  // create an object containing the name of the bucket, the key, body, and acl of the object.
  let deleteParams = {
    Bucket: bucketName,
    Delete: {
      Objects: [],
    },
  };

  // Loop through all the object keys sent pushing them to the params object.
  objectKeys.forEach((objectKey) =>
    deleteParams.Delete.Objects.push({
      Key: objectKey,
    })
  );

  // promisify the deleteObjects() function so that we can use the async/await syntax.
  //let removeObjects = promisify(this.s3.deleteObjects.bind(this.s3));

  // remove the objects.
  //await removeObjects(params).catch(console.log);

  let result = await s3
    .deleteObjects(deleteParams)
    .promise()
    .catch(console.log);

  // return the response to the client.
  return {
    success: true,
    message: "Successfully deleted objects",
    result: result,
  };
}
exports.deleteObjects = deleteObjects;
