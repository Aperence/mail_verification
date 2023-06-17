const Imap = require('imap');
const {simpleParser} = require('mailparser');
const db = require("./db")

const config = require("./config.json")
const imapConfig = config.imap_conf



const authorized_domains = config.authorized_domains

/**
 * Handle the register and add an user to the db if this user isn't previously already banned
 * 
 * @param from : the sender of the mail
 * @param subject : subject of the email
 * @param textAsHtml : text as html of the email
 * @param text : the text of the email
 */
function handle_register(from, subject, textAsHtml, text){
  let address = from.value[0].address;
  address  = address.split("@")
  let domain = address[1]
  let name = address[0]
  let pseudo = subject


  if (authorized_domains.indexOf(domain) != -1){
    db.check_banned(db.hash_mail(name)).then((res)=>{
        if (res){
            console.log(`User ${name} is banned and trying to recreate an account...`)
            return
        }else{
            db.add_user(name, pseudo).then(() => {
              // added user to the verified accounts
              console.log(`Successfully added user ${pseudo} to the server`)
            })
        }
    })
  }
}

function getEmails(callback){
    console.log("Running check on emails...")
    try {
      const imap = new Imap(imapConfig);
      imap.once('ready', () => {
        imap.openBox('INBOX', false, () => {
          imap.search(['UNSEEN'], (err, results) => {
            if (results.length == 0){
                return
            }
            const f = imap.fetch(results, {bodies: ''});
            f.on('message', msg => {
              msg.on('body', stream => {


                simpleParser(stream, async (err, parsed) => {
            
                  const {from, subject, textAsHtml, text} = parsed;
                  
                  callback(from, subject, textAsHtml, text)
                });

                msg.once('attributes', attrs => {
                    const {uid} = attrs;
                    imap.addFlags(uid, "Deleted", () => {});
                });
              });
            });
            f.once('error', ex => {
              return Promise.reject(ex);
            });
            f.once('end', () => {
              imap.end();
            });
          });
        });
      });
  
      imap.once('error', err => {
        console.log(err);
      });
  
      imap.once('end', () => {
        console.log('Connection ended');
      });
  
      imap.connect();
    } catch (ex) {
      console.log('an error occurred');
    }
  };
  
  

/*
//Example on how to use:


db.connect().then(() =>{

  getEmails(handle_register)
  setInterval(() => getEmails(handle_register),
     config.delayMilli) // call every dalayMilli ms
})
*/


module.exports = {
  "getEmails" : getEmails,
  "handle_register" : handle_register
}

