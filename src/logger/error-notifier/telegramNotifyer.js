const {Telegraf} = require('telegraf');

let bot;
let chatIds = new Set();

module.exports = function(telegramToken) {
    bot = new Telegraf(telegramToken);

    bot.start((ctx) => {
        chatIds.add(ctx.chat.id);
        ctx.reply('Welcome to the error notification bot!');
    });

    bot.launch();

    return (req, res, next) => {
        req.telegramBot = {
            notify: (message) => {
                chatIds.forEach(chatId => {
                    bot.telegram.sendMessage(chatId, message);
                });
            }
        };
        next();
    };
};
