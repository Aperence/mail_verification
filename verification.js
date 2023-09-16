const Imap = require('imap');
const {simpleParser} = require('mailparser');
const db = require("./db")

const config = require("./config.json")
const imapConfig = config.imap_conf



const authorized_domains = config.authorized_domains

class Verification{
  constructor(onVerifiedCallback, onBannedCallback) {
    this.onVerifiedCallback = onVerifiedCallback
    this.onBannedCallback = onBannedCallback
    db.connect().then(() =>{

      this.handle = setInterval(() => this.getEmails(),
              config.delayMilli) // call every delayMilli ms
    })
  }

  /**
   * Handle the register and add an user to the db if this user isn't previously already banned
   * 
   * @param from : the sender of the mail
   * @param subject : subject of the email
   * @param textAsHtml : text as html of the email
   * @param text : the text of the email
   */
  handle_register(from, subject, textAsHtml, text, onVerifiedCallback){
    let address = from.value[0].address;
    address  = address.split("@")
    let domain = address[1]
    let name = address[0]
    let pseudo = subject


    if (authorized_domains.indexOf(domain) != -1){
      db.check_banned(db.hash_mail(name)).then((res)=>{
          if (res){
              // console.log(`User ${name} is banned and trying to recreate an account...`)
              return
          }else{
              db.add_user(name, pseudo).then(() => {
                // added user to the verified accounts
                // console.log(`Successfully added user ${pseudo} to the server`)
                this.onVerifiedCallback(pseudo)
              })
          }
      })
    }
  }

  getEmails(){
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
                  
                  this.handle_register(from, subject, textAsHtml, text)
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

  ban(pseudo){
    db.get_user(pseudo).then(user =>{
      hashed_mail = user.mail
      db.add_ban(hashed_mail)

      for (let user of db.remove_user(hashed_mail)){
        this.onBannedCallback(user.pseudo)
      }
    })
  }

  shutdown(){
    clearInterval(this.handle)
  }
}

/**
 * 
 * How to use:
 * 
 * let verif = new Verification(onVerifyCallback, onBannedCallback)
 * 
 * onBan:
 *    verif.ban(userPseudo)
 * 
 * where onVerifyCallback, onBannedCallback are function taking only 1 argument : the pseudo of the user verified/banned
 */

module.exports = {
  "verification" : Verification
}

