const bodyParser = require('body-parser');
const express = require('express');
const { PORT, DB_USERNAME, DB_PASSWORD, DB_HOST,TELEGRAM_TOKEN, ...rest } = require('./config/env');
const database = require('./config/database');
const cors = require('cors');
const { onPipelineFinished, onPipelineError } = require('./src/events/index');
const { startCPPS } = require('./src/orchestra-conductor/startCPPS');


database.connect(DB_USERNAME, DB_PASSWORD, DB_HOST).then(() => {
   
    const app = express();
    
    app.use(cors()); //TODO: used for server when deploy in Cross-origin resource sharing
    app.use(bodyParser.json());
    
    
    startCPPS();

    onPipelineFinished(startCPPS);
    onPipelineError(startCPPS);//TODO: on error just starts again? on complex error it dosent seems right exeptions class

    app.listen(PORT, () => console.log(`example app listening on port ${PORT} ${rest.GREETING}`));
});
