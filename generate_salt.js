const bcrypt = require("bcrypt")

saltRounds = 10

bcrypt
  .genSalt(saltRounds)
  .then(salt => {
    console.log('Salt: ', salt)
  })