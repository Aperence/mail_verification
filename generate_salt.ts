const bcrypt = require("bcrypt")

let saltRounds = 10

bcrypt
  .genSalt(saltRounds)
  .then(salt => {
    console.log('Salt: ', salt)
  })

export {};