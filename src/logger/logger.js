const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const Telegram = require('winston-telegram');
const { Mail } = require('winston-mail');
const SlackHook = require("winston-slack-webhook-transport");

const isVerbose =  process.argv.includes('verbose') 
const isDebug =  process.argv.includes('debug');
const COOLDOWN_PERIOD = 10 * 60 * 1000; // 10 minutes in milliseconds
const lastUrgentLogTimestamps = {};

function canSendUrgentLog(serviceName) {
    const lastTimestamp = lastUrgentLogTimestamps[serviceName];
    if (!lastTimestamp) {
        return true;
    }
    const now = Date.now();
    return now - lastTimestamp > COOLDOWN_PERIOD;
}

function applyCooldown(transportName) {
    return winston.format((info, opts) => {
        if ( info.level === 'error' && !canSendUrgentLog(transportName)) {
            return false;
        }
        lastUrgentLogTimestamps[transportName] = Date.now();
        return info;
    })();
}

function createLogger(filename) {
    const logDir = '/data/data/com.termux/files/home/project-root-directory/cpps-server/logs';

    const customTimestamp = winston.format((info, opts) => {
        if (opts.timestamp) {
            info.timestamp = new Date().toLocaleString('he-IL', { hour12: false }).replace(/, /g, '-');
        }
        return info;
    });

    const fileVerboseTransport = new DailyRotateFile({
        level:'verbose',
        filename: `${logDir}/${filename}-%DATE%.log`,
        datePattern: 'DD-MM-YYYY',
        maxSize: '20m',
        maxFiles: '2d'
    });

    const fileInfoTransport = new DailyRotateFile({
        level:'info',
        filename: `${logDir}/${filename}-%DATE%.log`,
        datePattern: 'DD-MM-YYYY',
        maxSize: '20m',
        maxFiles: '2d'
    });

    const slackErrorTransport = new SlackHook({
        level:'error',
        webhookUrl: process.env.SLACK_ERROR,
        format : applyCooldown('slackErrorTransport')
    })

    const slackVerboseTransport = new SlackHook({
        level:'verbose',
        webhookUrl: process.env.SLACK_INFO,
        
    })



    const telegramTransport = new Telegram({
        token: process.env.TELEGRAM_TOKEN,
        chatId: process.env.CHAT_ID,
        level: 'error',
        format: applyCooldown('telegramTransport')
    });

    const gmailDest1Transport = new Mail({
        to: process.env.MAIL_DEST1,
        from: process.env.MAIL_SOURCE,
        subject: 'Error Notification',
        level: 'error',
        host: 'smtp.gmail.com',
        username: process.env.GMAIL_USERNAME,
        password: process.env.GMAIL_PASS,
        port: '587',
        tls: true,
        authentication: 'LOGIN',
        format: applyCooldown('gmailDest1Transport')
    });

    const gmailDest2Transport = new Mail({
        to: process.env.MAIL_DEST2,
        from: process.env.MAIL_SOURCE,
        subject: 'Error Notification',
        level: 'error',
        host: 'smtp.gmail.com',
        username: process.env.GMAIL_USERNAME,
        password: process.env.GMAIL_PASS,
        port: '587',
        tls: true,
        authentication: 'LOGIN',
        format: applyCooldown('gmailDest1Transport')  
    });

    const consoleTransport = new winston.transports.Console({
        level:'info'
    })

    const loggerTransports = [
        telegramTransport,
        gmailDest1Transport,
        gmailDest2Transport,
        slackErrorTransport,
        
    ];
    
    if (isVerbose) {
        loggerTransports.push(slackVerboseTransport,fileVerboseTransport);
    }
    if(isDebug){
        loggerTransports.push(fileVerboseTransport);
    }
    else{
        loggerTransports.push(consoleTransport);
    }
    
    const logger = winston.createLogger({
        format: winston.format.combine(
            customTimestamp({ timestamp: true }),
            winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} [${level}]: ${message}`;
            })
        ),
        transports: loggerTransports
    });
    
    return logger;
}

module.exports = {
    createLogger
};
