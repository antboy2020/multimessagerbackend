var express = require('express');
var bodyParser = require('body-parser');
// const axios = require('axios');
const dotenv = require("dotenv");
dotenv.config();

const twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// const Nexmo = require('nexmo');
// const nexmo = new Nexmo({
//   apiKey: '448f33c3',
//   apiSecret: 'mLkrhgNwyh8vxZEk'
// });

const app = express();
const port = 3000;

var jsonParser = bodyParser.json();
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

app.get('/getMessages', jsonParser, (req, res) => {
  let messagesWithClient = [];
  let from = false;
  let to = false;
  twilio.messages
    .list({
      from: req.query.clientNumber,
    })
    .then(messages => {
      messagesWithClient.push.apply(messagesWithClient, messages);
      from = true;
      if (to) {
        messagesWithClient.sort((messageA, messageB) => (messageA.dateSent > messageB.dateSent) ? 1 : -1);
        res.send(messagesWithClient);
      }
      console.log(messages.length);
    });
  twilio.messages
    .list({
      to: req.query.clientNumber,
    }).then(messages => {
      messagesWithClient.push.apply(messagesWithClient, messages);
      to = true;
      if (from) {
        messagesWithClient.sort((messageA, messageB) => (messageA.dateSent > messageB.dateSent) ? 1 : -1);
        res.send(messagesWithClient);
      }
      console.log(messages);
    })

})

app.post('/sendMessage', jsonParser, (req, res) => {
  twilio.messages
    .create({ body: req.body.message, from: req.body.from, to: req.body.to })
    .then(message => {
      res.sendStatus(200);
    }).catch(err => {
      console.log(err)
    });
})

app.post('/sendMessages', jsonParser, (req, res) => {
  const promises = [];
  let j = 0;
  for (let i = 0; i < req.body.numbers.length; i++) {
    let body = req.body.messageBody.replace('ADDRESS', req.body.addresses[i]);
    if (req.body.numbers[i] == req.body.numbers[i + 1]) {
      body += " Or any of these properties";
      for (j = 1; req.body.numbers[i] == req.body.numbers[i + j]; j++) {
        body += " ";
        body += req.body.addresses[i + j];
      }
      body += "?";
    }
    promises.push(twilio.messages.create({
      to: req.body.numbers[i],
      from: process.env.TWILIO_MESSAGING_SERVICE_SID,
      body: body
    }).then((success) => {
      console.log(success);
    }).catch((error) => {
      console.log(error);
    }));
    if (j > 0) {
      i = i + j - 1;
    }
    j = 0;
  }
})

app.get('/retrieveMessages', jsonParser, (req, res) => {
  console.log("wtf hit");
  const numbersMessaged = [];
  const messageThreads = {};
  const numbersReplied = [];
  const messageRepliedThreads = {};
  const resp = {};

  // var oneMonthAgo = new Date();
  // oneMonthAgo.setMonth(oneMonthAgo.getMonth - 1);

  //receives messageThreads
  twilio.messages.list({ limit: 1000 }).then(messages => {
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

    messages.filter(message => message.direction == "outbound-api").forEach(m => {
      if (!numbersMessaged.includes(m.to) && !numbersReplied.includes(m.to)) {
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

    resp['remainingMessages'] = messageThreads;
    resp['conversations'] = messageRepliedThreads;
    res.send(resp);
  });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
