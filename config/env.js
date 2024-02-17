const dotenv = require("dotenv");
dotenv.config({path:'/data/data/com.termux/files/home/project-root-directory/cpps-server/.env'});
console.log("env.js " , process.env.DB_USERNAME)
const env = {
            DB_USERNAME : process.env.DB_USERNAME,
            DB_PASSWORD : process.env.DB_PASSWORD,
            DB_HOST : process.env.DB_HOST,
            PORT : process.env.PORT,
            GREETING:'hello',
            FAREWELL:'goodbay',
            
            // logger props

            TELEGRAM_TOKEN : process.env.TELEGRAM_TOKEN,
            GMAIL_PASS : process.env.GMAIL_PASS,
            GMAIL_USERNAME : process.env.GMAIL_USERNAME,
            MAIL_DEST : process.env.MAIL_DEST,
            MAIL_SOURCE : process.env.MAIL_SOURCE,
            MAIL_DEST1 : process.env.MAIL_DEST1, 
            MAIL_DEST2 : process.env.MAIL_DEST2,
            CHAT_ID : process.env.CHAT_ID,
            SLACK_ERROR : process.env.SLACK_ERROR,
            SLACK_INFO : process.env.SLACK_INFO,
            
            //google drive credentials props

            CLIENT_ID : process.env.CLIENT_ID, 
            CLIENT_SECRET : process.env.CLIENT_SECRET,
            REDIRECT_URIS : process.env.REDIRECT_URIS,

            //google drive token props

            ACCESS_TOKEN : process.env.ACCESS_TOKEN,
            REFRESH_TOKEN : process.env.REFRESH_TOKEN,
            SCOPE : process.env.SCOPE,
            TOKEN_TYPE : process.env.TOKEN_TYPE,

            //socketio addrs

            SOCKETIO_ADDRS : process.env.SOCKETIO_ADDRS

        };
module.exports=env;