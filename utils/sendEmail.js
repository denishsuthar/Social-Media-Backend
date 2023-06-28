import nodeMailer from "nodemailer"
import { google } from "googleapis";
import { config } from "dotenv";


config({
  path:"./config/config.env"
})

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendEmail = async (options) => {
  const accessToken = await oAuth2Client.getAccessToken();
    const transporter = nodeMailer.createTransport({
      // host: process.env.SMPT_HOST,
      // port: process.env.SMPT_PORT,
      service: 'gmail',
      auth: {
        // user: process.env.SMPT_MAIL,
        // pass: process.env.SMPT_PASSWORD,
        type: 'OAuth2',
        user: process.env.EMAIL_ID,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });
  
    const mailOptions = {
      from: process.env.SMPT_MAIL,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };
  
    await transporter.sendMail(mailOptions);
  };

export default sendEmail