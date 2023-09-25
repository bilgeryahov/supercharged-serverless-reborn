const sdk = require('node-appwrite');
const crypto = require('node:crypto');
const otplib = require('otplib');
const qrcode = require('qrcode');

const db = '64de0c78978af6234921'; // db id
const collection = 'otp-users'; // collection id

module.exports = async function (req, res) {
  const client = new sdk.Client();

  const database = new sdk.Databases(client);
  const users = new sdk.Users(client);

  const { email, name } = JSON.parse(req.payload);
  const userId = crypto.randomBytes(5).toString('hex');
  const userPw = crypto.randomBytes(20).toString('hex');
  const secret = otplib.authenticator.generateSecret();

  client
    .setEndpoint(req.variables['APPWRITE_FUNCTION_ENDPOINT'])
    .setProject(req.variables['APPWRITE_FUNCTION_PROJECT_ID'])
    .setKey(req.variables['API_OTP_KEY']);

  users
    .create(userId, email, undefined, userPw, name)
    .then(
      () => database.createDocument(db, collection, userId, {
        'user-secret': secret
      }),
      (error) => res.json(error, error.code || 500)
    )
    .then(
      () => qrcode.toDataURL(otplib.authenticator.keyuri(email, 'appwrite-otp', secret)),
      (error) => res.json(error, error.code || 500)
    )
    .then(
      (response) => res.json({
        message: `${email} successfully registered!`,
        response // the data string to be scanned by an OTP auth app
      }, 201),
      (error) => res.json(error, error.code || 500)
    );
};
