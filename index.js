'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const xhub = require('express-x-hub');
const app = express();

const PORT = process.env.PORT || 8080;

app.use(xhub({algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var received_updates = [];

app.get('/', function(req, res) {
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});

app.get('/webhooks', function(req, res) {
  if (req.param('hub.mode') != 'subscribe'
      || req.param('hub.verify_token') != process.env.VERIFY_TOKEN) {
    res.sendStatus(401);
    return;
  }

  res.send(req.param('hub.challenge'));
});

app.post('/webhooks', function(req, res) {
  if (!req.isXHubValid()) {
    console.log('Received webhooks update with invalid X-Hub-Signature');
    res.sendStatus(401);
    return;
  }

  let phone_number_id = process.env.PHONE_NUMBER_ID;
  let token = process.env.TOKEN;

  if(
    req.body.hasOwnProperty("entry") && req.body.entry.length == 1 && req.body.entry[0].hasOwnProperty("changes")
    && req.body.entry[0].changes.length == 1 && req.body.entry[0].changes[0].hasOwnProperty("value")
    && req.body.entry[0].changes[0].value.hasOwnProperty("contacts")
    && req.body.entry[0].changes[0].value.contacts.length == 1
    && req.body.entry[0].changes[0].value.contacts[0].hasOwnProperty("wa_id")
  ){
      console.log("wa_id",req.body.entry[0].changes[0].value.contacts[0].wa_id);
      request(
        {
          method: 'POST',
          body: {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": req.body.entry[0].changes[0].value.contacts[0].wa_id,
            "type": "text",
            "text": {
              "body": "OK"
            }
          },
          json: true,
          url: 'https://graph.facebook.com/v13.0/'+phone_number_id+'/messages',
          headers: {
            'Authorization':'Bearer '+token
          }
        },
        function (error, response, body){

        }
      );
  }

  console.log(JSON.stringify(req.body, null, 2));
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.listen(PORT, function() {
  console.log('Starting webhooks server listening on port:' + PORT);
});
