const {Connector} = require('@google-cloud/cloud-sql-connector');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require("dotenv");
dotenv.config();

const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2/promise');
const flash = require('connect-flash');
const { spawn } = require('child_process');

const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
var username = 'test';
// This is just for testing
var items = [
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
router.get('/', async (request, response) => {
    // Get the items list here!
    // First step: Get the current date and check if there are any results that include this date
    let today = new Date().toISOString().slice(0, 10)
    // We need to find a place to clear the older deals!!!
    const checkquery = 'SELECT * FROM items WHERE valid_from <= ? AND valid_to >= ?';
    try{
        // Issue from last commit was that connection is undefined, so running connection.query gives an error
        // Root cause being forgot to add promise to require SQL line, so we are not awaiting for the connection to establish
        const connection = await pool.getConnection();
        const [results] = await connection.query(checkquery, [today, today]);
        console.log(results)
        if (results.length == 0) {
            // Clear the table first
            const clearquery = 'TRUNCATE TABLE items'
            connection.query(clearquery);
            console.log("truncated table")
            // Run the python script to load table items with newest deals
            // !!! Bug in this spawn line
            let userLocation;
            if (request.session.user !== undefined) {
                if (request.session.user.preferred_location !== null) userLocation = request.session.user.preferred_location;
                else userLocation = "m5b1r7";
            } else {
                if (request.session.postal !== "") userLocation = request.session.postal;
                else userLocation = "m5b1r7"
            }
            const python = spawn("/usr/bin/python3", [__dirname + '/../scrape_items.py', userLocation]);
            python.on('close', (code) => {
                console.log(`child process close all stdio with code: ${code}`);
            })
            python.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
              
            python.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            });
        }

        const getquery = 'SELECT * FROM items'
        const [db_items] = await connection.query(getquery);
            if (db_items.length > 0){
                request.session.items = db_items;
                console.log("should work")
            }

        if (request.session.loggedin) {
            // Case 1: user got to home page from *LOGIN PAGE*: request.session.user contains all user info
            // Case 2: user got to home page from *SIGN UP PAGE*: request.session.allergies contains allergies 
            // (there is no request.session.user because this object is the result returned from a database query, which we do not have when user signs up and we write into the database only. We can create the user object but since there is only 3 things to pass to home page, I decided that saving to a var is faster.)
            let userAllergies = request.session.user !== undefined ? request.session.user.allergies : (request.session.allergies !== "" ? request.session.allergies : null);
            let userLocation = request.session.user !== undefined ? request.session.user.preferred_location : (request.session.postal !== "" ? request.session.postal : "m5b1r7");
            response.render(path.join(__dirname + '/home.ejs'), {location: userLocation, items : request.session.items, 
                allergies: userAllergies, loggedin: true, username: request.session.username, item_message : request.flash('item_message'), recipes : {}});
    
        } else {
            // Not logged in
            response.render(path.join(__dirname + '/home.ejs'), {location: "m5b1r7", items : request.session.items, 
                allergies: "None", loggedin: false, item_message : request.flash('item_message'), recipes : {}});
        }
    } 
        catch (error) {
            console.error('Error loading home page (loading items): ', error);
            // Not sure what to do here
        }
        
    })

 
// Get the location informations
// router.post('/location', (req, res) => {
//     const location = req.body;
// })

router.post('/', (req, res) => {
    if (req.body.itemCheckbox === undefined){
        req.flash('item_message', 'Please select at least one item')
        res.redirect('/home')
        // flash a message saying please pick at least one item
        return;
    }
    
    // Need to change the arguments to `${req.body.itemCheckbox}`, `${req.body.itemPrice}` (hopefully)
    const python = spawn('python3', [__dirname + '/../optimization.py', "['apple', 'banana', 'candy', 'bread']", "[3.99, 4.00, 5.99, 6.99]", req.body.budget]);
    
    // This part is being skipped somehow
    python.stdout.on('data', (data) => {
        console.log('result?');
        dataToSend = data.toString();
    });
    python.on('close', (code) => {
        console.log(`child process close all stdio with code: ${code}`);
    })

    const geminiConfig = {
    temperature: req.body.creativity / 10,
    maxOutputTokens: 4096,
    };

    const geminiModel = googleAI.getGenerativeModel({
        model: "gemini-1.5-pro", 
        geminiConfig
    });

    // console.log()
    const generate = async () => {
        try {
            // Will send the dataToSend from optimization script to send in instead of itemCheckbox
            const prompt = `Can you recommend 1-3 different recipes using\
        ${req.body.itemCheckbox} with a budget of ${req.body.budget} and \
        avoid these allergies: ${req.body.allergies}. You do not have to include every ingredient I requested in every recipe. Use the ones you find suitable.\
        Please also include other ingredients needed in the recipe. Make sure to label each step of the instructions with 1., 2., 3., etc.\ 
        Please output only the json form of Recipe_name, Ingredients, and Instructions. Ingredients and Intructions should both be one long string.
        ex: [{
        "Recipe_name": "One Pot Cheeseburger Pasta",
        "Ingredients": "1 lb ground beef
            1 lb Italian sausage (remove casing if desired)
            1 onion, chopped
            1 green bell pepper, chopped
            1 (14.5 oz) can diced tomatoes, undrained
            1 (15 oz) can kidney beans, drained & rinsed
            1/2 cup beef broth
            1 tsp dried oregano
            1/2 tsp salt
            1/4 tsp black pepper
            1 head romaine lettuce, chopped
            1/4 cup shredded cheddar cheese (optional)",
        "Instructions": "1. Brown the ground beef and sausage in a large skillet over medium heat. Drain off any excess fat.
        2. Add the onion and green pepper and cook until softened, about 5 minutes.
        3. Stir in diced tomatoes, kidney beans, beef broth, oregano, salt, and pepper. Bring to a boil, then reduce heat and simmer for 15 minutes, or until flavors meld.
        4. Serve hot over a bed of chopped romaine lettuce and top with shredded cheddar cheese (optional)."
        }]. \
        (Please use the exact header as defined, 
        do not include any other text, and don't start a new recipe if there are not enough tokens)`;
            const result = await geminiModel.generateContent(prompt);
            var responses = result.response.text();
            responses = responses.replace("```json", "");
            responses = responses.replace("```", "");
            console.log(responses)
            const recipes = JSON.parse(responses);
            console.log(recipes);
            console.log(recipes.length)
            // Make sure recipes is not empty
            if (recipes.length === 0){
                req.flash('item_message', 'No recipes were generated. Please try again!')
                res.redirect('/home')
                return;
            } 
            let userAllergies = req.session.allergies ? req.session.allergies : 'None';

            res.render(path.join(__dirname + '/home.ejs'), {location: '', items : req.session.items, 
                allergies: userAllergies, loggedin: req.session.loggedin, username: req.session.username, 
                item_message : req.flash('item_message'), recipes : recipes});
    
        }catch (error){
            console.log("response error", error);
        }
    }
    generate()
})

// Still needa add user_id with this
async function saverecipe(recipe_name, recipe_description, recipe_url) {
    // Needa check if its logged in, if its not, then we send alert that only logged in users can save
    const savequery = "INSERT INTO `recipes` (`recipe_name`, `description`, `url`) VALUES (?, ?, ?)"
    
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(savequery, [recipe_name, recipe_description, recipe_url])

        console.log(`Successfully saved recipe: ${recipe_name}`)
        const retrieverecipequery = "SELECT recipe_id FROM recipes WHERE recipe_name = ?"
        const retrieveuserquery = "SELECT user_id FROM user WHERE username = ?"

        const storequery = "INSERT INTO `saved` ('recipe"
    }
    catch (error) {
        console.log('Failed to save recipe')
    }
}

// Needa think more about this
async function deleterecipe(recipe_name, recipe_description, recipe_url) {
    // Needa check if its logged in, if its not, then we send alert that only logged in users can save
    const savequery = "DELETE FROM `recipes`(`recipe_name`, `description`, `url`) VALUES (?, ?, ?)"
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(savequery, [recipe_name, recipe_description, recipe_url])
        console.log(`Successfully saved recipe: ${recipe_name}`)
    }
    catch (error) {
        console.log('Failed to save recipe')
    }
}

module.exports = router;