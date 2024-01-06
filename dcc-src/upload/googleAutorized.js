const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    "369239603492-fre83br6n9mj6i3t7kd1fh7dh5g4a5gq.apps.googleusercontent.com",
    "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",
  "http://localhost/"
);

async function getAccessToken(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens; // tokens contains the access token and refresh token
}

// Call this function with the authorization code
getAccessToken('4/0AfJohXmHWcuxfYCmid5EF3to2cMA0GaJdrNcIdo588PrNQ5DCJyPxR2YOxu8RBPGIjkw-Q')
  .then(tokens => console.log(tokens))
  .catch(error => console.error(error));