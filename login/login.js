const fs = require('fs');
const mysql = require('mysql2');
const express = require('express');
const session = require('express-session');
const path = require('path');

const connection = mysql.createConnection({
    host : 'localhost', 
    user : 'root', 
    password: '', 
    database: 'loblaw-recipe'
});

const app = express()

app.use(session({
    secret: 'secret', 
    resave: true, 
    saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'static')));

// Function to load and send the login page with a message
function loadLoginPage(response, message = '') {
    fs.readFile(path.join(__dirname, '/login/login.html'), 'utf8', (err, data) => {
        if (err) {
            response.status(500).send('Error loading login page');
            return;
        }
        // Inject the message into the HTML
        const modifiedData = data.replace('<!--MESSAGE_PLACEHOLDER-->', message);
        response.send(modifiedData);
    });
}

// http://localhost:3000/
app.get('/', function(request, response){
    // Render login template
    loadLoginPage(response);
});

app.get('/signup', function(request, response){
    response.sendFile(path.join(__dirname, '/signup/signup.html'))
});

// http://localhost:3000/auth
app.post('/auth', function(request, response){
    // Capture the input fields
    let username = request.body.username;
    let password = request.body.password;
    //Ensure the input fields exists and are not empty
    if (username && password){
        // Execute SQL query that'll select account from database
        connection.query('SELECT * FROM user WHERE username = ? AND password = ?', [username, password], function(error, results, fields){
            // If there's an issue with query, output error
            if (error) throw error;
            //If account exists
            if (results.length > 0){
                // Authenticate the user
                request.session.loggedin = true;
                request.session.username = username;
                // Redirect to home page
                response.redirect('/home');
            } else {
                loadLoginPage(response, 'Incorrect Username and/or Password!');
                // response.send('Incorrect Username and/or Password!');
            }
            response.end();
        });
    } else {
        loadLoginPage(response, 'Please enter Username and Password!');
        // response.send('Please enter Username and Password!');
        response.end();
    }
});

// http://localhost:3000/home
app.get('/home', function(request, response) {
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

app.listen(3000);