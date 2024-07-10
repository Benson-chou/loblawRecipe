const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2');
const flash = require('connect-flash')

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loblaw-recipe'
});

connection.connect();

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