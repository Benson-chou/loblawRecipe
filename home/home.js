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

// This is just for testing
const items = [
    {
        id: 1,
        itemname: 'Sword of Truth',
        bonuspoints: 10,
        condition: 'New'
    },
    {
        id: 2,
        itemname: 'Shield of Valor (Adding more to see how the box reacts)',
        bonuspoints: 8,
        condition: 'Used'
    },
    {
        id: 3,
        itemname: 'Helmet of Wisdom',
        bonuspoints: 5,
        condition: 'New'
    },
    {
        id: 4,
        itemname: 'Boots of Speed',
        bonuspoints: 7,
        condition: 'Used'
    },
    {
        id: 5,
        itemname: 'Cloak of Invisibility',
        bonuspoints: 12,
        condition: 'New'
    }
];


// http://localhost:3000/home
router.get('/', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin) {
        const query = 'SELECT * FROM user WHERE username = ?'
        connection.query(query, [request.session.username], function(error, results){
            // Output error if error
            if (error) throw error;
            // If username exists
            if (results.length > 0){
                // Render the home page with user location
		        response.render(path.join(__dirname + '/home.ejs'), { location : results[0].preferred_location, items : items, 
                    allergies: results[0].allergies, loggedin: true, username: request.session.username});
            }
        })
	} else {
		// Not logged in
        response.render(path.join(__dirname + '/home.ejs'), {location: '', items : {}, allergies: "", loggedin: false});
	}
});
 
// Get the location informations
router.post('/location', (req, res) => {
    const location = req.body;
    
})
// Get the loginForm informations
// router.post('/', (req, res) => {
//     const { username, password } = req.body;
//     const query = 'SELECT * FROM user WHERE username = ? AND password = ?'
//     connection.query(query, [username, password], function (error, results) {
//         // If there's an issue with query, output error
//         if (error) throw error;
//         //If account exists
//         if (results.length > 0) {
//             req.session.user = results[0];
//             // Authenticate the user
//             req.session.loggedin = true;
//             req.session.username = username;
//             // Redirect to home page
//             res.redirect('/home');
//         } else {
//             req.flash('message', 'Incorrect Username and/or Password')
//             res.redirect('/');
//         }
//         res.end();
//     });
// })

module.exports = router;