const bodyParser = require('body-parser');
const express = require('express');
const { PORT, DB_USERNAME, DB_PASSWORD, DB_HOST,TELEGRAM_TOKEN, ...rest } = require('./config/env');
const database = require('./config/database');
const cors = require('cors');
const scheduler = require('./src/scheduler/schedulerCPPS');


database.connect(DB_USERNAME, DB_PASSWORD, DB_HOST).then(() => {
   
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    
    scheduler.scheduleCPPS();


    app.listen(PORT, () => console.log(`example app listening on port ${PORT} ${rest.GREETING}`));
});
