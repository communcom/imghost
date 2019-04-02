const router = require('koa-router')();

router.get('/', () => {
    this.status = 200;
    this.statusText = 'OK';
    this.body = { status: 200, statusText: 'OK' };
});

router.get('/healthcheck', () => {
    this.status = 200;
    this.statusText = 'OK';
    this.body = { status: 200, statusText: 'OK' };
});

module.exports = router.routes();
