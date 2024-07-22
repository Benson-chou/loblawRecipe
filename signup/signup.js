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
    user: 'root',
    password: process.env.CLOUD_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
});

const connection = pool.getConnection();
const [result] = connection.query(`SELECT NOW();`);

console.table(result);

pool.end();
connector.close();

router.use(flash())

// http://localhost:3000/signup
router.get('/', function(request, response) {
	// Render login template
	response.render(path.join(__dirname + '/signup.ejs'), { message: request.flash('message')});
});


router.post('/', (req, res) => {
    const { username, password, postalCode, allergies } = req.body;
    connection.query('SELECT * FROM user WHERE username = ?', [username], function (error, results) {
        console.log("checked username")
        if (error) throw error;
        // If this account already exists
        if (results.length > 0) {
            // Need to output the following message
            req.flash('message', 'This username is taken. Please insert another username')
            res.redirect('/signup')
        } else {
            connection.query('INSERT INTO `user` (`username`, `password`, `preferred_location`, `allergies`) VALUES (?, ?, ?, ?)',
                [username, password, postalCode, allergies], function (error) {
                    if (error) throw error;
                    console.log(`User ${username} has been created.`)
                    res.redirect('/home');
                }
            )
        }
    });
});

module.exports = router;