const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loblaw-recipe'
});

connection.connect();

// http://localhost:3000/signup
router.get('/', function(request, response) {
	// Render login template
	response.sendFile(path.join(__dirname + '/signup.html'));
});


router.post('/', (req, res) => {
    const { username, password, postalCode, allergies } = req.body;
    connection.query('SELECT * FROM user WHERE username = ?', [username], function (error, results) {
        console.log("checked username")
        if (error) throw error;
        // If this account already exists
        if (results.length > 0) {
            // Need to output the following message
            res.send('This username is taken. Please insert another username')
            res.redirect('/')
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

// http://localhost:3000/home
router.get('/home', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin) {
		// Output username
		response.send('Welcome back, ' + request.session.username + '!');
	} else {
		// Not logged in
		response.send('Please login to view this page!');
	}
	response.end();
});

module.exports = router;