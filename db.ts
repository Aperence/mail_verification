const MongoClient = require("mongodb").MongoClient
const bcrypt = require("bcrypt")
const config = require("./config.json")
const url = config.db_url

const client = new MongoClient(url, { monitorCommands: true });


interface User{
    mail : string
    pseudo : string
}

/**
 * Hash a mail
 * @param {string} mail : the mail to hash
 * @returns the hashed mail as a string
 */
function hash_mail(mail : string) : string {
    return bcrypt.hashSync(mail, config.salt)
}

/**
 * Connect to the db
 */
async function connect(){
    await client.connect()
}

function close(){
    client.close()
}

/**
 * Check if a mail is banned
 * 
 * @param {string} hashed_mail : the mail to check if it is already banned
 * @returns true if the mail is banned, false otherwise
 */
async function check_banned(hashed_mail : string) : Promise<boolean>{

    const db = client.db('sinf_server');
    const collection = db.collection('banned');

    const user = await collection.findOne({"mail" : hashed_mail})

    return user != null
}

/**
 * Add an hashed email to the banned database
 * @param {string} hashed_mail : the mail to add as banned
 */
async function add_ban(hashed_mail : string){

    const db = client.db('sinf_server');
    const collection = db.collection('banned');

    await collection.insertOne({"mail" : hashed_mail})
}

/**
 * Add a user to the database, making a mapping between the verification mail used, and its pseudo
 * @param {string} mail 
 * @param {string} pseudo 
 */
async function add_user(mail : string, pseudo : string){
    const db = client.db('sinf_server');
    const collection = db.collection('users');

    let hashed_mail = hash_mail(mail)
    console.log(hashed_mail)

    await collection.insertOne({"pseudo" : pseudo, "mail" : hashed_mail})
}


/**
 * Remove all users with a given mail from the database
 * @param {string} hashed_mail : the mail of users
 * @returns a list of users deleted, with format [{"pseudo" : pseudo, "mail" : hashed_mail}]
 */
async function remove_user(hashed_mail : string) : Promise<Array<User>>{

    const db = client.db('sinf_server');
    const collection = db.collection('users');

    const users = await collection.find({"mail" : hashed_mail}).toArray()

    await collection.deleteMany({"mail" : hashed_mail})

    return users
}

/**
 * Get the informations of a user, according to its pseudo
 * @param {string} pseudo : the pseudo used by the user
 * @returns the info for the user, with following format {"pseudo" : pseudo, "mail" : hashed_mail}
 */
async function get_user(pseudo : string) : Promise<User>{
    const db = client.db('sinf_server');
    const collection = db.collection('users');

    let user = await collection.findOne({"pseudo" : pseudo})
    return user
}



/*Example 

let mail = "aperence@hotmail"
let hashed = hash_mail(mail)
let pseudo = "aperence"

connect().then(()=>{

    add_user(mail, pseudo).then(()=>{
        
        check_banned(hashed).then((res) => {
            console.log(res)

            remove_user(hashed).then((users) => {
                console.log(users)

                add_ban(hashed).then(()=>{})
            })
        })
    })
})
*/

module.exports = {
    "connect" : connect,
    "close" : close,
    "add_ban" : add_ban,
    "check_banned" : check_banned,
    'add_user' : add_user,
    "remove_user" : remove_user,
    "get_user" : get_user,
    "hash_mail" : hash_mail
}



