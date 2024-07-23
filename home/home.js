const {Connector} = require('@google-cloud/cloud-sql-connector');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require("dotenv");
dotenv.config();

const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2');
const flash = require('connect-flash');
const { spawn } = require('child_process');

const googleAI = new GoogleGenerativeAI(process.env.API_KEY);

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
router.get('/', async function(request, response) {
    // Get the items list here!
    // First step: Get the current date and check if there are any results that include this date
    // let today = new Date().toISOString().slice(0, 10)
    // // We need to find a place to clear the older deals!!!
    // const checkquery = 'SELECT * FROM items WHERE valid_from <= ? AND valid_to >= ?'
    // connection.query(checkquery, [today, today], function(err, res){
    //     if (err) throw err;
    //     // If there isn't, then we call the python file 
    //     if (results.length = 0){
    //         // Clear the table first
    //         const clearquery = 'TRUNCATE TABLE items'
    //         connection.query(clearquery, function(err, res){
    //             if (err) throw err;
    //         })
    //         // Run the python script to load table items with newest deals
    //         const python = spawn('python', ['../scrape_items.py']);
    //         python.on('close', (code) => {
    //             console.log('child process close all stdio with code: ${code}');
    //         })
    //     }
    //     // Then we pull items from the database
    //     const getquery = 'SELECT * FROM items'
    //     connection.query(getquery, function(err, res){
    //         if (err) throw err;
    //         if (results.length > 0){
    //             const items = res;
    //         }
    //     })
    // })


	// If the user is loggedin
	if (request.session.loggedin) {
        let userAllergies = request.session.user !== undefined ? request.session.user.allergies : (request.session.allergies !== undefined ? request.session.allergies : null);
        response.render(path.join(__dirname + '/home.ejs'), {location: '', items : items, 
            allergies: userAllergies, loggedin: true, username: request.session.username, item_message : request.flash('item_message'), recipes : {}});

	} else {
		// Not logged in
        response.render(path.join(__dirname + '/home.ejs'), {location: '', items : items, 
            allergies: "", loggedin: false, item_message : '', recipes : {}});
	}
});
 
// Get the location informations
// router.post('/location', (req, res) => {
//     const location = req.body;
// })

router.post('/process_items', (req, res) => {
    if (req.body.itemCheckbox === undefined){
        req.flash('item_message', 'Please select at least one item')
        res.redirect('/home')
        // flash a message saying please pick at least one item
        return;
    }
    const geminiConfig = {
    temperature: req.body.creativity / 10,
    topP: 1,
    topK: 1,
    maxOutputTokens: 4096,
    };

    const geminiModel = googleAI.getGenerativeModel({
        model: "gemini-pro", 
        geminiConfig
    });

    const generate = async () => {
        try {
            const prompt = `Can you recommend me some online recipes with their URL using\
        ${req.body.itemCheckbox} with a budget of ${req.body.budget} and \
        avoid these allergies: ${req.body.allergies}. \
        Please output only the json form of Recipe name, Description, and URL.`;
            const result = await geminiModel.generateContent(prompt);
            const responses = result.response.text();
            const recipes = JSON.parse(responses)

            // Make sure recipes is not empty
            if (recipes.length === 0){
                req.flash('item_message', 'No recipes were generated. Please try again!')
                res.redirect('/home')
                return;
            } 
            
            // Insert recipe into the table
            const insertRecipe = (recipe) => {
                const insertquery = "INSERT INTO recipes (recipe_name, description, url)\
                    VALUES (?, ?, ?)"
                connection.query(insertquery, [recipe['Recipe name'], recipe['Description'], recipe['URL']], (err, res) => {
                    if (err) throw err;
                    console.log(`Inserted recipe: ${recipe['Recipe name']}`);
                });
            };
            recipes.array.forEach(recipe => {
                insertRecipe(recipe);
            });
            

            console.log(response.text());
            // Load the response into database first and then create tables? 
        }catch (error){
            console.log("response error", error);
        }
    }
    generate()
})


module.exports = router;