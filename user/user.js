const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2/promise');
const flash = require('connect-flash')
const {Connector} = require('@google-cloud/cloud-sql-connector');
const dotenv = require('dotenv');
const { connect } = require('http2');
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
router.get('/', async(request, response) => {
	// Render login template
    // Need loggedin, location, allergies, recipes, 
    // updateFail, updateSuccess
    if (request.session.loggedin) {
        // pull the user saved recipes from database
        try{
            const connection = await pool.getConnection();
            const savedRecipeQuery = "SELECT r.recipe_name AS Recipe_name, r.ingredients AS Ingredients, r.description AS Instructions\
                                    FROM recipes AS r INNER JOIN saved AS s\
                                    ON r.recipe_id = s.recipe_id\
                                    INNER JOIN user AS u\
                                    ON s.username = u.username\
                                    WHERE u.username = ?"
            var [savedRecipesResults] = await connection.query(savedRecipeQuery, [request.session.username])
            if (savedRecipesResults.length === 0) {
                savedRecipesResults = null
            }
        } catch (error){
            console.error('Error querying saved recipes: ', error);
            request.flash('updateFail', 'Failed to query saved recipes. Please try again.');
            response.redirect('/user');
        }
        response.render(path.join(__dirname + '/user.ejs'), {username: request.session.username, loggedin: request.session.loggedin, location: request.session.user.preferred_location, 
            allergies: request.session.allergies, recipes: savedRecipesResults, updateFail : request.flash('updateFail'), 
            updateSuccess : request.flash('updateSuccess')
        })
    } else {
        response.render(path.join(__dirname + '/user.ejs'), {username: "Guest", loggedin: request.session.loggedin, location: "m5b1r7", 
            allergies: "None", recipes: null, updateFail : request.flash('updateFail'), 
            updateSuccess : request.flash('updateSuccess')
        })
    }
});

router.post('/location', async(req, res) => {
    try{
        const {postalCode} = req.body;
        let cleanPostal = postalCode.toLowerCase().replace(/\s+/g, '');
        if (request.session.loggedin) {
            request.session.postal = cleanPostal
            // Update the user data in database
            const connection = await pool.getConnection();
            const [results] = await connection.query('UPDATE user SET preferred_location = ? WHERE username = ?', [cleanPostal, request.session.username]);
            console.log('Finished updating location: ', results);
            connection.release();
        } else {
            request.session.postal = cleanPostal
        }
        req.flash('updateSuccess', 'Successfully updated location!');
    }
    catch (error) {
        console.error('Error updating location: ', error);
        req.flash('updateFail', 'Failed to update location. Please try again.');
        res.redirect('/user');
    }
})

router.post('/allergies', async(req, res) => {
    try{
        const {allergies} = req.body;
        if (request.session.loggedin) {
            request.session.allergies = allergies
            // Update the user data in database
            const connection = await pool.getConnection();
            const [results] = await connection.query('UPDATE user SET allergies = ? WHERE username = ?', [cleanPostal, request.session.username]);
            console.log('Finished updating allergies: ', results);
            connection.release();
        } else {
            request.session.allergies = allergies
        }
        req.flash('updateSuccess', 'Successfully updated allergies!');
    }
    catch (error) {
        console.error('Error updating allergies: ', error);
        req.flash('updateFail', 'Failed to update allergies. Please try again.');
        res.redirect('/user');
    }
})
// TO-DO: This part haven't worked on yet
router.post('/changePassword', async(req, res) => {
    try{
        const {oldPassword, newPassword, re_enteredPassword} = req.body;
        const checkOldQuery = "SELECT * FROM user WHERE username = ? AND password = ?"
        const updatePassQuery = "UPDATE user SET password = ? WHERE username = ?"
        // Check if the oldPassword matches. If it doesn't, then return immediately and alert message
        const connection = await pool.getConnection();
        const [checkOldResults] = await connection.query(checkOldQuery, [req.session.username, oldPassword])
        if (checkOldResults.length === 0) {
            alert("Old Password Incorrect! Please retry")
            res.redirect('/user');
            return;
        }
        // Then can prob just run the query to update the table value
        await connection.query(updatePassQuery, [newPassword, req.session.username])
        console.log("Successfully updated password")
        req.flash('updateSuccess', 'Successfully updated password!');
    }
    catch (error) {
        console.error('Error updating password: ', error);
        req.flash('updateFail', 'Failed to update password. Please try again.');
        res.redirect('/user');
    }
})


module.exports = router;