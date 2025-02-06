import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import session from 'express-session';

// Initialiseer de Express-app
const app = express();
const port = 3000;

// Verbind met de MySQL-database
const connection = mysql.createConnection({
    host: 'localhost',  // Vervang door je MySQL host (meestal localhost)
    user: 'root',       // Vervang door je MySQL-gebruikersnaam
    password: 'Matthijs06!', // Vervang door je MySQL-wachtwoord
    database: 'mealplanner',  // Vervang door de naam van je database
});

// Zorg ervoor dat je verbinding correct is
connection.connect((err) => {
    if (err) {
        console.error('Fout bij verbinden met de database:', err.stack);
        return;
    }
    console.log('Verbonden met de database!');
});

// Correcte manier om __dirname te verkrijgen in ES-modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stel de body-parser in om formuliergegevens te verwerken
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'zqnQuw5eZf',  // Gebruik een sterke geheime sleutel!
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Zet op true als je HTTPS gebruikt
}));

// Zet Liquid als view engine
import { Liquid } from 'liquidjs';
const engine = new Liquid();
app.engine('liquid', engine.express()); 
app.set('views', path.join(__dirname, 'views'));  // Zorg ervoor dat je 'views' map hebt
app.set('view engine', 'liquid');

// Rootroute voor de landingspagina
app.get('/', (req, res) => {
    res.render('index', { title: "Welkom bij Meal Planner" });
});

// Route om de registratiepagina weer te geven
app.get('/register', (req, res) => {
    res.render('register', { title: "Registreren" });
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    // Controleer of naam, email en wachtwoord zijn ingevuld
    if (!name || !email || !password) {
        return res.render('register', { title: 'Register', errorMessage: 'Naam, email en wachtwoord zijn verplicht!' });
    }

    // E-mail validatie met een reguliere expressie
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.render('register', { title: 'Register', errorMessage: 'Voer een geldig e-mailadres in.' });
    }

    // Controleer of email of naam al bestaat
    const queryCheck = 'SELECT * FROM users WHERE email = ? OR name = ?';
    connection.execute(queryCheck, [email, name], (err, results) => {
        if (err) {
            console.error('Fout bij controleren bestaande gegevens:', err);
            return res.render('register', { title: 'Register', errorMessage: 'Er is een fout opgetreden bij het controleren van gegevens.' });
        }

        if (results.length > 0) {
            // Als naam of email al bestaat, geef foutmelding
            return res.render('register', { title: 'Register', errorMessage: 'E-mail of gebruikersnaam is al in gebruik! Kies een andere.' });
        }

        // Als alles in orde is, sla de gebruiker op in de database
        const queryInsert = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        connection.execute(queryInsert, [name, email, password], (err, results) => {
            if (err) {
                console.error('Fout bij registreren:', err);
                return res.render('register', { title: 'Register', errorMessage: 'Er is een fout opgetreden bij het registreren.' });
            }
            res.send('Registratie succesvol! Je kunt nu inloggen.');
        });
    });
});

// Route om de loginpagina weer te geven
app.get('/login', (req, res) => {
    res.render('login', { title: "Inloggen" });
});

// Route voor de login POST-aanvraag
app.post('/login', (req, res) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
        return res.render('login', { title: 'Inloggen', errorMessage: 'E-mail/gebruikersnaam en wachtwoord zijn verplicht!' });
    }

    const query = 'SELECT * FROM users WHERE (email = ? OR name = ?) AND password = ?';
    connection.execute(query, [emailOrUsername, emailOrUsername, password], (err, results) => {
        if (err) {
            console.error('Fout bij inloggen:', err);
            return res.render('login', { title: 'Inloggen', errorMessage: 'Er is een fout opgetreden bij het inloggen.' });
        }

        if (results.length > 0) {
            req.session.user = results[0];  // ✅ Gebruiker opslaan in sessie!
            console.log('Ingelogd als:', results[0].name);
            res.redirect('/dashboard');
        } else {
            return res.render('login', { title: 'Inloggen', errorMessage: 'Ongeldige gebruikersnaam of wachtwoord!' });
        }
    });
});



// Route om de mainpagina weer te geven
app.get('/main', (req, res) => {
    res.render('main', { title: "main" });
});

// Route voor de main POST-aanvraag
app.post('/main', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send('Email en wachtwoord zijn verplicht!');
    }

    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    connection.execute(query, [email, password], (err, results) => {
        if (err) {
            console.error('Fout bij inloggen:', err);
            return res.send('Er is een fout opgetreden bij het inloggen.');
        }

        if (results.length > 0) {
            req.session.user = results[0];  // ✅ Gebruiker opslaan in sessie!
            console.log('Ingelogd als:', results[0].name);
            res.redirect('/dashboard');
        } else {
            return res.send('Ongeldige gebruikersnaam of wachtwoord!');
        }
    });
});

// Route voor dashboard of hoofdpagina na inloggen
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const user_id = req.session.user.id;
    const query = 'SELECT * FROM meals WHERE user_id = ? ORDER BY FIELD(day, "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag")';

    connection.execute(query, [user_id], (err, results) => {
        if (err) {
            console.error('Fout bij ophalen maaltijden:', err);
            return res.send('Er is een fout opgetreden.');
        }

        res.render('dashboard', { name: req.session.user.name, meals: results });
    });
});

app.get('/delete-meal/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const mealId = req.params.id;
    const userId = req.session.user.id;

    const query = 'DELETE FROM meals WHERE id = ? AND user_id = ?';
    connection.execute(query, [mealId, userId], (err) => {
        if (err) {
            console.error('Fout bij verwijderen maaltijd:', err);
            return res.send('Er is een fout opgetreden bij het verwijderen.');
        }
        res.redirect('/dashboard');
    });
});

app.get('/edit-meal/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const mealId = req.params.id;
    const query = 'SELECT * FROM meals WHERE id = ?';

    connection.execute(query, [mealId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Fout bij ophalen maaltijd:', err);
            return res.send('Maaltijd niet gevonden.');
        }

        res.render('edit-meal', { meal: results[0] });
    });
});

app.post('/edit-meal/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const mealId = req.params.id;
    const { meal_name, calories, day } = req.body;

    const query = 'UPDATE meals SET name = ?, calories = ?, day = ? WHERE id = ?';
    connection.execute(query, [meal_name, calories, day, mealId], (err) => {
        if (err) {
            console.error('Fout bij bewerken maaltijd:', err);
            return res.status(500).send('Fout bij bewerken.');
        }
        res.send('Succes');  // AJAX zal hiermee de pagina herladen
    });
});



app.post('/add-meal', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { meal_name, calories, day } = req.body;
    const user_id = req.session.user.id;  // Haal ingelogde gebruiker op

    const query = 'INSERT INTO meals (user_id, day, name, calories) VALUES (?, ?, ?, ?)';
    connection.execute(query, [user_id, day, meal_name, calories], (err) => {
        if (err) {
            console.error('Fout bij toevoegen maaltijd:', err);
            return res.send('Er is een fout opgetreden.');
        }
        res.redirect('/dashboard');
    });
});




// Start de server
app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});
