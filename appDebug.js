const bodyParser = require('body-parser');
const express = require('express');
const { PORT, DB_USERNAME, DB_PASSWORD, DB_HOST,TELEGRAM_TOKEN, ...rest } = require('./config/env');
const database = require('./config/database');
const cors = require('cors');
const { onPipelineFinished, onPipelineError } = require('./src/events/index');
const { debugCPPS } = require('./debug-src/orchestra-conductor/debugCPPS');


database.connect(DB_USERNAME, DB_PASSWORD, DB_HOST).then(() => {
   
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    
    
    debugCPPS();

    onPipelineFinished(debugCPPS);
    onPipelineError(debugCPPS)

    app.listen(PORT, () => console.log(`example app listening on port ${PORT} ${rest.GREETING}`));
});
