const client = require('../index.js');
const pg = require('pg')
require('dotenv').config()

const dbconfig = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const dbClient = new pg.Client(dbconfig);

dbClient.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to PostgreSQL Database of ' + dbconfig.database + '');
    }
})

dbClient.on("error", err => {
	return console.log(err);
})

module.exports = dbClient;