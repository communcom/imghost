const express = require('express');
const cors = require('cors');

const { connect } = require('./db');
const config = require('./config');
const { checkOrigin } = require('./utils/origin');

const jsonConf = JSON.stringify(config, null, 2);

console.log(`\n> Applications starting with config:\n============\n${jsonConf}\n============`);

const { checkReferer } = require('./utils/origin');

const healthCheck = require('./routes/healthCheck');
const imageServer = require('./routes/imageServer');
const uploadData = require('./routes/uploadData');

connect();

const app = express();

app.disable('x-powered-by');

app.use(
    cors({
        origin: (origin, callback) => {
            callback(null, checkOrigin(origin));
        },
    })
);

app.use(healthCheck);
app.use(uploadData);
app.use(checkReferer, imageServer);

const port = process.env.IN_DOCKER ? 80 : config.port;

app.listen(port);
console.log(`> Application started on port ${port}`);
