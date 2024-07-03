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

// http://localhost:3000/login
router.get('/', function(request, response){
    // Render login template
    response.sendFile(path.join(__dirname + '/login/login.html'));
});

// Get the loginForm informations
router.post('/', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM user WHERE username = ? AND password = ?'
    connection.query(query, [username, password], function (error, results) {
        // If there's an issue with query, output error
        if (error) throw error;
        //If account exists
        if (results.length > 0) {
            req.session.user = results[0];
            // Authenticate the user
            req.session.loggedin = true;
            req.session.username = username;
            // Redirect to home page
            res.redirect('/home');
        } else {
            // loadLoginPage(response, 'Incorrect Username and/or Password!');
            alert('Incorrect Username and/or Password')
            res.redirect('/');
        }
        res.end();
    });
})

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