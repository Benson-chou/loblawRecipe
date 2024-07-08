const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2');
const session = require('express-session')
const flash = require('connect-flash')

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loblaw-recipe'
});

connection.connect();

router.use(session({
    secret: 'secret', 
    resave: false, 
    saveUninitialized: true
}));
router.use(flash())

// http://localhost:3000/login
router.get('/', function(request, response){
    // Render login template
    response.render(path.join(__dirname + '/login.ejs'), { message : request.flash('message')});
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
            req.flash('message', 'Incorrect Username and/or Password')
            res.redirect('/');
        }
        res.end();
    });
})

module.exports = router;