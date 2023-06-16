const Imap = require('imap');
const {simpleParser} = require('mailparser');

const config = require("./config.json")
const imapConfig = config.imap_conf

const db = require("./db")

const authorized_domains = config.authorized_domains

function getEmails(){
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
        // all mail read, write it to file
        write_file()
        console.log('Connection ended');
      });
  
      imap.connect();
    } catch (ex) {
      console.log('an error occurred');
    }
  };
  
  
db.connect().then(() =>{
  getEmails()
  setInterval(() => getEmails(), 15000) // call every 15s
})
