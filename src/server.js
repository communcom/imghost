const express = require('express');
const cors = require('cors');

const { connect } = require('./db');
const config = require('./config');

const jsonConf = JSON.stringify(config, null, 2);

console.log(`\n> Applications starting with config:\n============\n${jsonConf}\n============`);

const healthCheck = require('./routes/healthCheck');
const dataServer = require('./routes/dataServer');
const uploadData = require('./routes/uploadData');
const imageProxy = require('./routes/imageProxy');

function checkOrigin(origin) {
    if (!origin || config.allowedOrigins.includes(origin)) {
        return true;
    }

    if (process.env.NODE_ENV !== 'production') {
        if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
            return true;
        }
    }

    return false;
}

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
app.use(dataServer);
app.use(uploadData);
app.use(imageProxy);

const port = process.env.IN_DOCKER ? 80 : config.port;

app.listen(port);
console.log(`> Application started on port ${port}`);
