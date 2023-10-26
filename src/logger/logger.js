const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const Telegram = require('winston-telegram');
const { Mail } = require('winston-mail');
const SlackHook = require("winston-slack-webhook-transport");

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
        if (info.level === 'error' && !canSendUrgentLog(transportName)) {
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

    const fileTransport = new DailyRotateFile({
        filename: `${logDir}/${filename}-%DATE%.log`,
        datePattern: 'DD-MM-YYYY',
        maxSize: '20m',
        maxFiles: '2d'
    });

    const slackErrorTransport = new SlackHook({
        level:'error',
        webhookUrl:'https://hooks.slack.com/services/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'
    })

    const slackInfoTransport = new SlackHook({
        level:'info',
        webhookUrl:'https://hooks.slack.com/services/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'
    })


    const telegramTransport = new Telegram({
        token: process.env.TELEGRAM_TOKEN,
        chatId: process.env.CHAT_ID,
        level: 'error',
        format: applyCooldown(filename + '-telegram')
        
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
        format: applyCooldown(filename + '-gmail')
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
        format: applyCooldown(filename + '-gmail')
    });

    const logger = winston.createLogger({
        format: winston.format.combine(
            customTimestamp({ timestamp: true }),
            winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} [${level}]: ${message}`;
            })
        ),
        transports: [fileTransport,slackInfoTransport,telegramTransport, gmailDest1Transport,gmailDest2Transport,slackErrorTransport]
    });

    return logger;
}

module.exports = {
    createLogger
};
