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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader("Content-Type", "application/json");;

  // Pass to next layer of middleware
  next();
});

app.post('/sendMessages', jsonParser, (req, res) => {
  Promise.all(
    req.body.numbers.map((number, index) => {
      body = req.body.messageBody.replace('ADDRESS', req.body.addresses[index]);
      return twilio.messages.create({
        to: number,
        from: process.env.TWILIO_MESSAGING_SERVICE_SID,
        body: body
      });
    })
  )
    .then(messages => {
      console.log('Message sent!');
      res.sendStatus(200);
    })
    .catch(err => {
      console.error(err)
      res.sendStatus(500);
    })
  // console.log("done");
})

app.get('/retrieveMessages', jsonParser, (req, res) => {
  const numbersMessaged = [];
  const messageThreads = {};
  const numbersReplied = [];
  const messageRepliedThreads = {};
  const resp = {};

  //receives messageThreads
  twilio.messages.list().then(messages => {
    messages.filter(message => message.direction == "outbound-api").forEach(m => {
      if (!numbersMessaged.includes(m.to)) {
        numbersMessaged.push(m.to);
      }
    })
    numbersMessaged.forEach(number => {
      if (messageThreads[number]) {
        messageThreads[number] = messageThreads.get(number).concat(messages.filter(message => message.from == number)).sort((messageA, messageB) => (messageA.dateSent > messageB.dateSent) ? 1 : -1);
      } else {
        messageThreads[number] = messages.filter(message => message.from == number || message.to == number).sort((messageA, messageB) => (messageA.dateSent > messageB.dateSent) ? 1 : -1);
      }
    })

    messages.filter(message => message.direction == "inbound").forEach(m => {
      if (!numbersReplied.includes(m.from)) {
        numbersReplied.push(m.from);
      }
    })
    numbersReplied.forEach(number => {
      if (messageRepliedThreads[number]) {
        messageRepliedThreads[number] = messageRepliedThreads.get(number).concat(messages.filter(message => message.from == number)).sort((messageA, messageB) => (messageA.dateSent > messageB.dateSent) ? 1 : -1);
      } else {
        messageRepliedThreads[number] = messages.filter(message => message.from == number || message.to == number).sort((messageA, messageB) => (messageA.dateSent > messageB.dateSent) ? 1 : -1);
      }
    })
    resp['allMessages'] = messageThreads;
    resp['conversations'] = messageRepliedThreads;
    res.send(resp);
  });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
