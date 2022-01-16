const formData = require("form-data");
const Mailgun = require("mailgun.js");

const mailgun = new Mailgun(formData);
const client = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
  public_key: process.env.MAILGUN_PUBLIC_KEY,
  url: process.env.MAILGUN_URL,
});
function sendEmail(messageData) {
  client.messages
    .create(process.env.MAILGUN_SUB_DOMAIN, messageData)
    .then((res) => {
      console.error(res);
    })
    .catch((err) => {
      console.error(err);
    });
}

exports.sendEmail = sendEmail;
