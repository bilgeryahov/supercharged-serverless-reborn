const sdk = require("node-appwrite");
const otplib = require('otplib');
const crypto = require('node:crypto');
const fetch = (...args) => import('node-fetch')
  .then(({ default: fetch }) => fetch(...args));

const db = '64de0c78978af6234921'; // db id
const collection = 'otp-users'; // collection id

module.exports = async function (req, res) {
  const client = new sdk.Client();

  const database = new sdk.Databases(client);
  const users = new sdk.Users(client);

  const { email, otp } = JSON.parse(req.payload);
  const newPw = crypto.randomBytes(10).toString('hex');
  let userId = null;

  client
    .setEndpoint(req.variables['APPWRITE_FUNCTION_ENDPOINT'])
    .setProject(req.variables['APPWRITE_FUNCTION_PROJECT_ID'])
    .setKey(req.variables['API_OTP_KEY']);

  users.list(
    [
      sdk.Query.equal('email', email)
    ]
  )
    .then(
      (response) => {
        if (response.total !== 1) {
          return Promise.reject('Invalid authentication attempt!');
        }

        userId = response.users[0].$id;
        return database.getDocument(db, collection, userId);
      },
      (error) => res.json(error)
    )
    .then(
      (response) => {
        if (otplib.authenticator.check(otp.toString(), response['user-secret'])) {
          return Promise.resolve();
        }
        return Promise.reject('Unauthorized!');
      },
      (error) => res.json(error)
    )
    .then(
      () => users.updatePassword(userId, newPw),
      (error) => res.json(error)
    )
    .then(
      () => fetch(
        `${req.variables['APPWRITE_FUNCTION_ENDPOINT']}/account/sessions/email`,
        {
          method: 'POST',
          body: JSON.stringify({
            "email": email,
            "password": newPw
          }),
          headers: {
            'X-Appwrite-Project': req.variables['APPWRITE_FUNCTION_PROJECT_ID'],
            'Content-Type': 'application/json'
          }
        }
      ),
      (error) => res.json(error)
    )
    .then(
      (response) => res.json({
        headers: response.headers.raw()
      }),
      (error) => res.json(error)
    );
};
