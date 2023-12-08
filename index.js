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

async function logIn(table) {
    try {

        console.log("\nEnter your credentials to log in, or input 0 for both fields to return to the menu\n");

        let userName = await getUserInput("Username:");
        let password = await getUserInput("Password:")

        if(userName == 0 && password == 0) {
            return;
        }

        const findUserQuery = {
            text: `SELECT * FROM ${table} WHERE email=$1 AND password=$2`,
            values: [userName, password]
        };

        const results = await pool.query(findUserQuery);
        if(results.rowCount != 0) {
            user = results;
            return true;
        } else {
            console.log("\nThe credentials you've entered don't match any members in our system. Please try again.\n");
            return await logIn(table);
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

async function findAvailableClasses() {
    try {
        const cQuery = {
            text: 'SELECT * FROM Classes WHERE s_id IS NOT NULL'
        }

        return await pool.query(cQuery);
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function findRegisteredClasses() {
    try {
        const rcQuery = {
            text: `SELECT registered.c_id, class_name, room_number, date, staff.f_name || ' ' || staff.l_name AS Trainer FROM registered JOIN classes 
                                                                        ON registered.c_id = classes.c_id JOIN staff ON classes.s_id = staff.s_id WHERE m_id=$1`,
            values: [user.rows[0].m_id]
        };

        let res = await pool.query(rcQuery);
        return res;
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function findAllTrainers() {
    try {
        const tQuery = {
            text: `SELECT s_id, f_name || ' ' || l_name AS Name FROM staff WHERE type=$1`,
            values: ['Trainer']
        }
        let res = await pool.query(tQuery);
        return res;
    } catch (error) {
        console.error("Error executing query: ", error);
    }


}

async function findScheduledTrainings() {
    try {
        const stQuery = {
            text: `SELECT t_id, m_id, f_name || ' ' || l_name AS Trainer, t_date AS Date FROM training JOIN staff ON training.s_id = staff.s_id WHERE m_id=$1`,
            values: [user.rows[0].m_id]
        };

        let res = await pool.query(stQuery);
        return res;
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}
async function deleteScheduledTraining(t_id) {
    try {
        const dQuery = {
            text: 'DELETE FROM TRAINING WHERE t_id=$1',
            values: [t_id]
        }

        await pool.query(dQuery);
        console.log("\nTraining successfully cancelled.")
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

async function trainerViewMembers() {
    try {
        const viewMemQuery = {
            text: `SELECT m_id, f_name, l_name, email, height, weight, gender FROM Member`,
        }

        return await pool.query(viewMemQuery);
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function findExerciseList(target) {
    try {
        const eListQuery = {
            text: `SELECT e_id, e_name FROM exercises WHERE e_area = (SELECT e_area FROM e_pointer WHERE e_id=$1)`,
            values: [target]
        };

        return await pool.query(eListQuery);
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function findExerciseName(target) {
    try {
        const eQuery = {
            text: `SELECT e_name FROM exercises WHERE e_id=$1`,
            values: [target]
        };

        return await pool.query(eQuery);
    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function registerActivty(m_id, e_id, dist, sets, reps, weight, date) {
    try {

        let res = await findExerciseName(e_id);

        const regActQuery = {
            text: 'INSERT INTO mem_activity(m_id, e_id, e_name, dist, sets, reps, weight_added, e_date) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
            values: [m_id, e_id, res.rows[0].e_name, dist, sets, reps, weight, date]
        };

        await pool.query(regActQuery);

        console.log("\nActivity added\n");

        if(e_id == 1 || e_id == 6 || e_id == 16 || e_id == 18) {
            let check = await findMember('achievements', 'm_id', m_id);
            if(e_id == 1 && check.rows[0].pr_cardio < dist) {
                console.log("Congratulations! You surpassed your previous cardio achievement!")
                updateAttr("achievements", 'pr_cardio', dist, 'm_id', m_id);
            } else if (e_id == 6 && check.rows[0].pr_bench < weight) {
                console.log("Congratulations! You surpassed your previous bench press achievement!")
                updateAttr("achievements", 'pr_bench', weight, 'm_id', m_id);
            } else if (e_id == 16 && check.rows[0].pr_squat < weight) {
                console.log("Congratulations! You surpassed your previous squat achievement!")
                updateAttr("achievements", 'pr_squat', weight, 'm_id', m_id);
            } else if (e_id == 18 && check.rows[0].pr_dl < weight) {
                console.log("Congratulations! You surpassed your previous dead lift achievement!")
                updateAttr("achievements", 'pr_dl', weight, 'm_id', m_id);
            }
        }

    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function regForClass(c_id, m_id) {
    try{
        const regQuery = {
            text: `INSERT INTO Registered(c_id, m_id) VALUES ($1,$2)`,
            values: [c_id, m_id]
        };

        await pool.query(regQuery);

    } catch (error) {
        console.error("Error executing query: ", error);
    }
}

async function regTrainingSession(s_id, date) {
    try {
        const rtsQuery = {
            text: `INSERT INTO training(m_id, s_id, t_date) VALUES($1, $2, $3)`,
            values: [user.rows[0].m_id, s_id, date]
        };

        await pool.query(rtsQuery);
        console.log("\nTraining session successfully registered.");
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
        while(initChoice != 4) {
            await printInitalMenu();
            initChoice = await getUserInput(">");
            if(initChoice == 1) {
                res = await logIn('Member');
                if(res) {
                    await memberDashboard();
                }
            } else if (initChoice == 2) {
                res = await logIn('Staff')
                if(res) {
                    await staffDashboard();
                }
            } else if (initChoice == 3) {
                await registerUser();
            } else if (initChoice == 4) {
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
        console.log("\n--------MEMBER DASHBOARD---------");
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

async function staffDashboard() {

    console.log(`\nHello ${user.rows[0].f_name} ${user.rows[0].l_name}`);

    if(user.rows[0].type == 'Trainer') {
        let choice = -1;
        while(choice != 3) {

            console.log("\n--------TRAINER DASHBOARD---------");

            console.log("\nPlease select an option:\n");
            console.log("1. Manage Schedule");
            console.log("2. View Members");
            console.log("3. Return");
            
            if(choice == 1) {
                let mChoice = -1;
                while(mChoice != 5) {

                    console.log("\n--------MANAGE SCHEDULE---------");
                    console.log("1. View Training Schedule");
                    console.log("2. Add Training Session");
                    console.log("3. Delete Training Session");
                    console.log("4. Input Comment");
                    console.log("5. Return");
                    
                    mChoice = await getUserInput(">");
                    if(mChoice == 1) {

                    } else if (mChoice == 2) {

                    } else if (mChoice == 3) {

                    } else if (mChoice == 4) {

                    } else if (mChoice == 5) {
                        return;
                    } else {
                        console.log("\nThat was not an acceptable choice. Please try again.\n");
                    }
                }
            } else if (choice == 2) {
                await trainerViewMembers();
            } else if (choice == 3) {
                return;
            } else {
                console.log("\nThat was not an acceptable choice. Please try again.\n");
            }

        }
    } else {
        console.log("Admin")
    }

    return;

}

async function manageProfile() {

    let profChoice = -1;
    while (profChoice != 4) {

        console.log("\n--------MANAGE PROFILE---------\n");

        console.log("\nPlease select an option:\n");
        console.log("1. View Profile");
        console.log("2. Edit Profile");
        console.log("3. Check Account Balance");
        console.log("4. Return");

        profChoice = await getUserInput(">");
        if(profChoice == 1) {
            console.log("\n--------VIEW PROFILE---------\n");
            console.log(`MemberID: ${user.rows[0].m_id}\nName: ${user.rows[0].f_name} ${user.rows[0].l_name}\nEmail: ${user.rows[0].email}`); 
            let h = user.rows[0].height == null ? "Height:" : `Height: ${user.rows[0].height}cm`;
            console.log(h);
            let w = user.rows[0].weight == null ? "Weight:" : `Weight: ${user.rows[0].weight}lbs`;
            console.log(w);
            let g = user.rows[0].gender == null ? "Gender:" : `Gender: ${user.rows[0].gender}`;
            console.log(g);

        } else if (profChoice == 2) {
            let eChoice = -1;
            let change;
            console.log("\n--------EDIT PROFILE---------\n");
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
            console.log("\n--------CHECK BALANCE---------");
            console.log(`\nAccount Balance: ${user.rows[0].acc_balance}`);
        } else if(profChoice == 4){
            return;
        } else {
            console.log("\nThat was not an acceptable choice. Please try again.\n");
        }
    }
}

async function manageGoals() {

    let choice = -1;
    while(choice != 3) {

        console.log("\n--------MANAGE GOALS---------\n");

        console.log("\nPlease select an option:\n");
        console.log("1. View Goals");
        console.log("2. Edit Goals");
        console.log("3. Return");

        choice = await getUserInput(">");
        if(choice == 1) {
            console.log("\n--------VIEW GOALS---------\n");
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
        } else if (choice == 2) {
            let eChoice = -1;
            let change;
            console.log("\n--------EDIT GOALS---------\n");
            while(eChoice != 6) {

                console.log("\nWhat would you like to edit?\n");
                console.log("1. Target Weight");
                console.log("2. Target Distance Run");
                console.log("3. Target Bench Press");
                console.log("4. Target Squat");
                console.log("5. Target Dead Lift");
                console.log("6. Return");

                eChoice = await getUserInput(">");
                if(eChoice == 6) {
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

}

async function manageActivity() {

    let choice = -1;
    let  res;
    while(choice != 6) {

        console.log("\n--------MANAGE ACTIVITY---------");

        console.log("\nPlease select an option:\n");
        console.log("1. View Gym Exercises");
        console.log("2. View Personal Activity");
        console.log("3. Record Personal Activity");
        console.log("4. Gym Classes");
        console.log("5. 1-on-1 Personal Training");
        console.log("6. Return");        

        choice = await getUserInput(">");
        if(choice == 1) {

            let eChoice = -1;
            
            while(eChoice != 9) {

                console.log("\n--------VIEW EXERCISES---------\n");

                console.log("\nEnter in the area of exercise you are searching for, or enter 9 to return to previous menu:\n");
                console.log("1. Cardio");
                console.log("2. Chest");
                console.log("3. Back");
                console.log("4. Legs");
                console.log("5. Shoulders");
                console.log("6. Biceps");  
                console.log("7. Triceps");  
                console.log("8. Core");  
                console.log("9. Return");

                eChoice = await getUserInput(">");
                if(eChoice == 9) {
                    break;
                } else if (eChoice < 1 || eChoice > 9) {
                    console.log("\nThat was not an acceptable choice. Please try again.\n");
                } else {
                    res = await findExerciseList(eChoice);
                    console.log("\n-------------------------------\n");
                    console.table(res.rows);
                }
            }
                   
        } else if (choice == 2) {
            
            console.log("\n--------PERSONAL ACTIVITY---------\n");
            res = await findMember('mem_activity', 'm_id', user.rows[0].m_id)
            console.table(res.rows);
            
        } else if (choice == 3) {
            console.log("\n--------RECORDING PERSONAL ACTIVITY---------\n");
                        
            console.log("Please provide the following information (Enter nothing if not applicable):");
            let e = await getUserInput("Exercise ID");
            let dist = await getUserInput("Distance Travelled:");
            if(dist === "") {
                dist = null;
            }

            let s = await getUserInput("Sets:");
            if(s === "") {
                s = null;
            }

            let r = await getUserInput("Reps:")
            if(r === "") {
                r = null;
            }
            let w = await getUserInput("Weight lifted:")
            if(w === "") {
                w = null;
            }
            let date = await getUserInput("Date of exercise (YYYY-MM-DD)");

            if(e != "") {
                await registerActivty(user.rows[0].m_id, e, dist, s, r, w, date);
            }


        } else if (choice == 4) {

            let rChoice = -1;
            let res;

            while(rChoice != 4) {
                console.log("\n--------GYM CLASSES---------");

                console.log("\nPlease select an option:\n");
                console.log("1. View Offered Classes");
                console.log("2. View Registered Classes");
                console.log("3. Register For Class");
                console.log("4. Return");

                rChoice = await getUserInput(">");
                if(rChoice == 1) {
                    res = await findAvailableClasses();
                    console.table(res.rows);
                } else if (rChoice == 2) {
                    res = await findRegisteredClasses();
                    console.table(res.rows)
                } else if (rChoice == 3) {
                    let cChoice = await getUserInput("Enter the course ID you would like to register for:");
                    let res = await findAvailableClasses();
                    let avail = false;
                    for(let i = 0; i < res.rowCount; i++) {
                        if(res.rows[i].c_id == cChoice){
                            console.log(`c_id: ${res.rows[i].c_id}`)
                            avail = true;
                        }
                    }
                    if(avail) {
                        await regForClass(cChoice, user.rows[0].m_id);
                    } else {
                        console.log("Im sorry. The course you selected is not available.");
                    }
                } else if (rChoice == 4) {
                    break;
                } else {
                    console.log("\nThat was not an acceptable choice. Please try again.\n");
                }
            }

        } else if (choice == 5) {
            
            let tChoice = -1;
            let res;
            while(tChoice != 5) {
                console.log("\n--------1-ON-1 PERSONAL TRAINING---------\n");

                console.log("\nPlease select an option:\n");
                console.log("1. View Available Trainers");
                console.log("2. View Scheduled Trainings");
                console.log("3. Delete Scheduled Training");
                console.log("4. Register For Training");
                console.log("5. Return");
                tChoice = await getUserInput(">");
                if(tChoice == 1) {
                    console.log("\n--------TRAINERS---------\n");
                    res = await findAllTrainers();
                    console.table(res.rows);
                } else if(tChoice == 2){
                    console.log("\n--------SCHEDULED TRAININGS---------\n");
                    res = await findScheduledTrainings();
                    console.table(res.rows)
                }else if(tChoice == 3){
                    console.log("\n--------CANCEL TRAINING---------\n");
                    let dChoice = await getUserInput("Please input the ID of the training session you wish to cancel:");
                    let found = false;
                    res = await findScheduledTrainings();
                    for(let i = 0; i < res.rowCount; i++) {
                        if(res.rows[i].t_id == dChoice) {
                            found = true;
                        }
                    }
                    if(found) {
                        await deleteScheduledTraining(dChoice);
                    } else {
                        console.log("\nThe number you have entered cannot be found in our training schedule. Please try again.");
                    }
                    
                }else if(tChoice == 4){
                    console.log("\n--------REGISTER TRAINING---------\n");
                    let s = await getUserInput("Please enter the id of the trainer you would like to schedule a session with:");
                    let d = await getUserInput("Please enter the date you'd like to train on (YYYY-MM-DD):");
                    await regTrainingSession(s, d);
                }else if(tChoice == 5){
                    break;
                } else {
                    console.log("\nThat was not an acceptable choice. Please try again.\n");
                }


            }

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