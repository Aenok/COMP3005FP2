const { Pool } = require('pg');     // To connect to the database
const readline = require('readline');       // used for asynchronous user input
let user;

// connecting to the postgres database
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    port: 5432,
    database:"FitnessAppDB"
});

startApp();

//-----------------------------------------DATABASE MANIPULATION FUNCTIONS-----------------------------------------

async function logIn() {
    try {

        console.log("\nEnter your credentials to log in, or input 0 for both fields to return to the menu\n");

        let userName = await getUserInput("Username:");
        let password = await getUserInput("Password:")

        if(userName == 0 && password == 0) {
            return;
        }

        const findUserQuery = {
            text: 'SELECT * FROM Member WHERE email=$1 AND password=$2',
            values: [userName, password]
        };

        const results = await pool.query(findUserQuery);
        if(results.rowCount != 0) {
            user = results;
            return true;
        } else {
            console.log("\nThe credentials you've entered don't match any members in our system. Please try again.\n");
            return await logIn();
        }
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function findMember(table, attr, val) {
    try{
        const query = {
            text: `SELECT * FROM ${table} WHERE ${attr}=$1`,
            values: [val]
        }
        
        return await pool.query(query);

    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function registerUser() {
    try {

        console.log("\nThank you for choosing to register with FitFusion! We just need a few things to get start:\n")

        let first_name = await getUserInput("First Name:");
        let last_name = await getUserInput("Last Name:");
        let email_addr = await getUserInput("Email Address:");
        while(await checkForEmail(email_addr)) {
            console.log("I'm sorry. That already exists in our database. Please use a different one");
            email_addr = await getUserInput("Email Address:");
        }
        let password = await getUserInput("Password:");

        // Create query for new entry into Member table
        const regMemQuery = {
            text: 'INSERT INTO Member(f_name, l_name, email, password) VALUES($1, $2, $3, $4)',
            values: [first_name, last_name, email_addr, password]
        };
        await pool.query(regMemQuery);
        
        let newMem = await findMember('Member', 'email', email_addr);     // To get a hold of the new member entry so that we can use their m_id attribute to register them in other tables

        // Create query for new entry into mem_goals table
        const regGoalQuery = {
            text: 'INSERT INTO Mem_Goals(m_id) VALUES($1)',
            values: [newMem.rows[0].m_id]
        };

        await pool.query(regGoalQuery);

        // Create query for new entry into achievements table
        const regAchQuery = {
            text: 'INSERT INTO Achievements(m_id) VALUES($1)',
            values: [newMem.rows[0].m_id]
        };

        await pool.query(regAchQuery);

        console.log("\nThank you for registering with us! Please log in.");
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function updateAttr(table, attr1, val1, attr2, val2 ) {
    try {
        const updateQuery = {
            text: `UPDATE ${table} SET ${attr1}=$1 WHERE ${attr2}=$2`,
            values: [val1, val2]
        };

        

        return await pool.query(updateQuery);
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

//-----------------------------------------PROGRAM-SPECIFIC FUNCTIONS-----------------------------------------

async function startApp() {

    // try to connect
    try {

        console.log("\n--------FITFUSION GYM----------");

        let initChoice = -1;
        let res = false;
        while(initChoice != 3) {
            await printInitalMenu();
            initChoice = await getUserInput(">");
            if(initChoice == 1) {
                res = await logIn();
                if(res) {
                    await memberDashboard();
                }
            } else if (initChoice == 2) {
                await registerUser();
            } else if (initChoice == 3) {
                await quit();             
            } else {
                console.log("\nThat was not an acceptable choice. Please try again.\n");
            }
        }

    } catch (error) {
        console.error('Error connecting to the database: ', error);
    }
}

async function memberDashboard() {

    console.log(`\nHello ${user.rows[0].f_name} ${user.rows[0].l_name}`);

    let choice = -1;
    while(choice != 5) {
        console.log("\n--------DASHBOARD---------");
        await printMembermenu();
        choice = await getUserInput(">");
        if(choice == 1) {
            await manageProfile();
        } else if (choice == 2) {
            await manageGoals();
        } else if (choice == 3) {
            await viewAchievements();
        } else if (choice == 4) {
            await manageActivity();
        } else if(choice == 5) {
            return;
        } else {
            console.log("\nThat was not an acceptable choice. Please try again.\n");
        }
    }

}

async function manageProfile() {

    let profChoice = -1;
    while (profChoice != 4) {

        console.log("\nPlease select an option:\n");
        console.log("1. View Profile");
        console.log("2. Edit Profile");
        console.log("3. Check Account Balance");
        console.log("4. Return");

        profChoice = await getUserInput(">");
        if(profChoice == 1) {
            console.log("\n--------PROFILE---------\n");
            console.log(`MemberID: ${user.rows[0].m_id}\nName: ${user.rows[0].f_name} ${user.rows[0].l_name}\nEmail: ${user.rows[0].email}`); 
            let h = user.rows[0].height == null ? "Height:" : `Height: ${user.rows[0].height}cm`;
            console.log(h);
            let w = user.rows[0].weight == null ? "Weight:" : `Weight: ${user.rows[0].weight}lbs`;
            console.log(w);
            let g = user.rows[0].gender == null ? "Gender:" : `Gender: ${user.rows[0].gender}`;
            console.log(g);
            console.log("\n------------------------\n");

        } else if (profChoice == 2) {
            let eChoice = -1;
            let change;
            console.log("\n--------EDIT---------\n");
            while(eChoice != 7) {
                console.log("\nWhat would you like to edit?\n");
                console.log("1. First Name");
                console.log("2. Last Name");
                console.log("3. Email");
                console.log("4. Height");
                console.log("5. Weight");
                console.log("6. Gender");
                console.log("7. Return");

                eChoice = await getUserInput(">");
                if(eChoice == 7) {
                    break;
                }
                console.log("What would you like to change it to?");
                change = await getUserInput(">");

                while((eChoice == 4 || eChoice == 5) && (isNaN(parseInt(change)))) {
                    console.log("\nThe value you've entered is not acceptable. Please enter in a number for the value of the change.");
                    change = await getUserInput(">");
                }

                if(eChoice == 1) {
                    await updateAttr('Member', 'f_name', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 2) {
                    await updateAttr('Member', 'l_name', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 3) {
                    await updateAttr('Member', 'email', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 4) {
                    await updateAttr('Member', 'height', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 5) {
                    await updateAttr('Member', 'weight', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 6) {
                    await updateAttr('Member', 'gender', change, 'm_id', user.rows[0].m_id);
                } else {
                    console.log("\nThat was not an acceptable choice. Please try again.\n");
                }
                user = await findMember('Member', 'm_id', user.rows[0].m_id);
            }
        } else if (profChoice == 3) {
            console.log("\n--------BALANCE---------");
            console.log(`\nAccount Balance: ${user.rows[0].acc_balance}`);
            console.log("\n------------------------");
        } else if(profChoice == 4){
            return;
        } else {
            console.log("\nThat was not an acceptable choice. Please try again.\n");
        }
    }
}

async function viewAchievements() {

    console.log("\n--------ACHIEVEMENTS---------\n");
    let results = await findMember('Achievements', 'm_id', user.rows[0].m_id);

    let w = (results.rows[0].pr_weight == null) ? `PR Weight:` : `PR Weight: ${results.rows[0].pr_weight}lbs`;
    console.log(w);
    let c = (results.rows[0].pr_cardio == null) ? `PR Distance Run:` : `PR Distance Run: ${results.rows[0].pr_cardio}KM`;
    console.log(c);
    let b = (results.rows[0].pr_bench == null) ? `PR Bench Press:` : `PR Bench Press: ${results.rows[0].pr_bench}lbs`;
    console.log(b);
    let s = (results.rows[0].pr_squat == null) ? `PR Squat:` : `PR Squat: ${results.rows[0].pr_squat}lbs`;
    console.log(s);
    let d = (results.rows[0].pr_dl == null) ? `PR Dead Lift:` : `PR Dead Lift: ${results.rows[0].pr_dl}lbs`;
    console.log(d);
    let p = (results.rows[0].pr_prot == null) ? `PR Protein Shake Drank:` : `PR Protein Shake Drank: ${results.rows[0].pr_prot}L`;
    console.log(p);    

}

async function manageGoals() {

    let choice = -1;
    while(choice != 3) {

        console.log("\nPlease select an option:\n");
        console.log("1. View Goals");
        console.log("2. Edit Goals");
        console.log("3. Return");

        choice = await getUserInput(">");
        if(choice == 1) {
            console.log("\n--------GOALS---------\n");
            let results = await findMember('mem_goals', 'm_id', user.rows[0].m_id);
            let w = (results.rows[0].t_weight == null) ? `Target Weight:` : `Target Weight: ${results.rows[0].t_weight}lbs`;
            console.log(w);
            let c = (results.rows[0].t_cardio == null) ? `Target Distance Run:` : `Target Distance Run: ${results.rows[0].t_cardio}KM`;
            console.log(c);
            let b = (results.rows[0].t_bench == null) ? `Target Bench Press:` : `Target Bench Press: ${results.rows[0].t_bench}lbs`;
            console.log(b);
            let s = (results.rows[0].t_squat == null) ? `Target Squat:` : `Target Squat: ${results.rows[0].t_squat}lbs`;
            console.log(s);
            let d = (results.rows[0].t_dl == null) ? `Target Dead Lift:` : `Target Dead Lift: ${results.rows[0].t_dl}lbs`;
            console.log(d);
            let p = (results.rows[0].t_prot == null) ? `Target Protein Shake Drank:` : `Target Protein Shake Drank: ${results.rows[0].t_prot}L`;
            console.log(p);
        } else if (choice == 2) {
            let eChoice = -1;
            let change;
            console.log("\n--------EDIT---------\n");
            while(eChoice != 7) {

                console.log("\nWhat would you like to edit?\n");
                console.log("1. Target Weight");
                console.log("2. Target Distance Run");
                console.log("3. Target Bench Press");
                console.log("4. Target Squat");
                console.log("5. Target Dead Lift");
                console.log("6. Largest Proteint Shake Drank");
                console.log("7. Return");

                eChoice = await getUserInput(">");
                if(eChoice == 7) {
                    break;
                }

                console.log("What would you like to change it to?");
                change = await getUserInput(">");
                while(isNaN(parseInt(change))) {
                    console.log("\nThe value you've entered is not acceptable. Please enter in a number for the value of the change.");
                    change = await getUserInput(">");
                }
                
                if(eChoice == 1) {
                    await updateAttr('mem_goals', 't_weight', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 2) {
                    await updateAttr('mem_goals', 't_cardio', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 3) {
                    await updateAttr('mem_goals', 't_bench', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 4) {
                    await updateAttr('mem_goals', 't_squat', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 5) {
                    await updateAttr('mem_goals', 't_dl', change, 'm_id', user.rows[0].m_id);
                } else if (eChoice == 6) {
                    await updateAttr('mem_goals', 't_prot', change, 'm_id', user.rows[0].m_id);
                } else {
                    console.log("\nThat was not an acceptable choice. Please try again.\n");
                }
            }
        } else if (choice == 3) {
            return;
        } else {
            console.log("\nThat was not an acceptable choice. Please try again.\n");
        }
    }
}

async function manageActivity() {

    let choice = -1;
    while(choice != 3) {

        console.log("\nPlease select an option:\n");
        console.log("1. View Gym Exercises");
        console.log("2. View Personal Activity");
        console.log("3. Record Personal Activity");
        console.log("4. Gym Classes");
        console.log("5. 1-on-1 Personal Training");
        console.log("6. Return");        

        choice = await getUserInput(">");
        if(choice == 1) {

            console.log("\n--------GYM EXERCISES---------\n");     
                   
        } else if (choice == 2) {

            let uChoice = -1;

            while(uChoice != 3) {
                console.log("\n--------PERSONAL ACTIVITY---------\n");
                console.log("\nPlease select an option:\n");
                console.log("1. Past Activity");
                console.log("2. Future Activity");
                console.log("3. Return");

                uChoice = await getUserInput(">");
                if(uChoice == 1) {
                    console.log("Showing past activity");
                } else if (choice == 2) {
                    console.log("Showing futre activity");
                } else if (choice == 3) {
                    return;
                } else {
                    console.log("\nThat was not an acceptable choice. Please try again.\n");
                }
            }
        } else if (choice == 3) {
            console.log("\n--------RECORDING PERSONAL ACTIVITY---------\n");
        } else if (choice == 4) {
            console.log("\n--------GYM CLASSES---------\n");
        } else if (choice == 5) {
            console.log("\n--------1-ON-1 PERSONAL TRAINING---------\n");
        } else if (choice == 6) {
            return;
        } else {
            console.log("\nThat was not an acceptable choice. Please try again.\n");
        }
    }

}

// Helper function that prints out the menu
async function printInitalMenu() {
    console.log("\nWelcome to the FitFusion Fitness App! Please choose from the following:\n");
    console.log("1. Member Log In");
    console.log("2. Staff Log In");
    console.log("3. Register New Member");
    console.log("4. Quit");
}

// Helper function that prints out member menu
async function printMembermenu() {
    console.log("\nPlease select what you'd like to do:\n");
    console.log("1. Manage Profile");
    console.log("2. Manage Goals");
    console.log("3. View Achievements");
    console.log("4. Manage Gym Activity");
    console.log("5. Log Out");
}

async function checkForEmail(e) {
    const checkQuery = {
        text: 'SELECT * FROM Member WHERE email=$1',
        values: [e]
    }

    const results = await pool.query(checkQuery);
    return (results.rowCount == 1);
}

async function quit() {
    console.log("\nFrom all of us at FitFusion, thank you for using our stoneage era fitness app.\nGoodbye!\n");
    process.exit(0);   
}

// Helper function that takes a promptText as an argument and creates a readline interface. From there a promise is returned with what the user chooses
async function getUserInput(promptText) {

    const r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        r1.question(promptText + ' ', (answer) => {
            r1.close();
            resolve(answer);
        })
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}