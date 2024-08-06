const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2/promise');
const flash = require('connect-flash')
const {Connector} = require('@google-cloud/cloud-sql-connector');
const dotenv = require('dotenv');
dotenv.config();

const connector = new Connector();
const clientOpts = connector.getOptions({
    instanceConnectionName: process.env.CLOUD_CONNECTION_NAME,
    ipType: 'PUBLIC',
  });

const pool = mysql.createPool({
    ...clientOpts,
    host: process.env.CLOUD_HOST,
    user: process.env.CLOUD_USER,
    password: process.env.CLOUD_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
});

router.use(flash())

// http://localhost:3000/user
router.get('/', function(request, response) {
	// Render login template
	response.render(path.join(__dirname + '/user.ejs'))});
    // , { message: request.flash('message')});

module.exports = router;