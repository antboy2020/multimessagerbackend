var express = require('express')
var bodyParser = require('body-parser')
const dotenv = require("dotenv");
dotenv.config();

const twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express()
const port = 3000

var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// Add headers
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', "*");

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

app.post('/sendMessages', jsonParser, (req, res) => {
  let i = 0;

  Promise.all(
    req.body.numbers.map(number => {
      body = req.body.messageBody.replace('ADDRESS', req.body.addresses[i]);
      i++;
      return twilio.messages.create({
        to: number,
        from: process.env.TWILIO_MESSAGING_SERVICE_SID,
        body: body
      });
    })
  )
    .then(messages => {
      console.log('Messages sent!');
    })
    .catch(err => console.error(err))
  console.log("done");
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
