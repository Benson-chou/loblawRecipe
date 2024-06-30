var a = require('../login');

// http://localhost:3000/signup
app.get('/signup', function(request, response) {
	// Render login template
	response.sendFile(path.join(__dirname + '/signup/signup.html'));
});

// http://localhost:3000/signup/auth
a.app.post('/signup/auth', function(request, response){
    // Capture the input fields
    let username = request.body.username;
    let password = request.body.password;
    let postalCode = request.body.postalCode;
    let allergies = request.body.allergies

    //Ensure the input fields exists and are not empty
    if (username && password){
        // Execute SQL query that'll select account from database
        a.connection.query('SELECT * FROM user WHERE username = ?', [username], function(error, results, fields){
            if (error) throw error;
            // If this account already exists
            if (results.length > 0){
                // Need to output the following message
                response.send('This username is taken. Please insert another username')
            } else {
                a.connection.query('INSERT INTO `user` (`username`, `password`, `preferred_location`, `allergies`) VALUES (?, ?, ?, ?)', 
                   [username, password, postalCode, allergies], function(error, fields){
                        if (error) throw error;
                        response.send('User ' + username + ' has been created.')
                        response.redirect('/home');
                   }
                )}
            response.end();
        });
    }
});
// http://localhost:3000/home
a.app.get('/home', function(request, response) {
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
a.app.listen(3000, function(){
    console.log("At Sign up page")
})