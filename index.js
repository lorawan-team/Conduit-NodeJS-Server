'use strict';
var request = require('request');
var mqtt = require('mqtt');
var nodemailer = require('nodemailer');

// MQTT settings
var url = 'mqtt://127.0.0.1';
var client = mqtt.connect(url);

// POST request settings
var api = 'https://delta-api.fourfusion.nl/';

// Mail settings
var mailSenderName = 'Delta LoRaWAN';
var mailSenderAddress = 'deltamailer1337@gmail.com';
// Seperate the receivers with a comma
var mailReceivers = 'wege0014@hz.nl, splu0008@hz.nl';
// Enter the hardcoded credentials for your mail account, don't forget to replace your '@' by '%40'
// Example: nodemailer.createTransport('smtps://_MAILADRES_%40_MAILPROVIDER:_PASSWORD_@_MAILSERVER');
var transporter = nodemailer.createTransport('smtps://deltamailer1337%40gmail.com:spo2mailer@smtp.gmail.com');

// Connects to all public LoRaWAN transmitters through MQTT.
client.on('connect', function () {
  // If you see 'connected, subscribing' in your terminal, this indicates that the app has started. This could take some time.
  console.log('connected, subscribing');
  client.subscribe('lora/+/up');
  mail('Conduit Gateway (re)started', 'The Conduit gateway was (re)started, maybe something went wrong, but errors are send in a seperate mail.');
});

client.on('message', function (topic, message) {
  parseMessage(topic, message);
});

/**
 * If an error occurs, the application currently quits. This should be a development only thing.
 */
client.on('error', function (error) {
  console.log('mqtt error: ', error);
  mail('Multitech Conduit crashed', error);
  process.exit();
});

/**
 * This function reacts when the Gateway receives a MQTT message. It then parses the messages to JSON objects.
 * @function
 * @param {string} topic - The euid of the LoRaWAN device.
 * @param {string} message - The MQTT message that's broadcasted by the LoRaWAN transmitter.
 */
function parseMessage (topic, message) {
  var eui = topic.split('/')[1];
  var json = JSON.parse(message.toString());

  // Optional objects that you could use in your application.
  /* freq = json.freq;
  datarate = json.datr;
  snr = json.lsnr;
  rssi = json.rssi;
  sequence_number = json.seqn;
  timestamp = json.timestamp; */

  // decode base64 payload
  var data = new Buffer(json.data, 'base64');
  data = data.toString();
  console.log('eui: ', eui);
  console.log('data: ', data);
  submit(eui, data);
}

/**
 * Submits the data to an API
 * @function
 * @param {string} eui - The euid of the LoRaWAN device.
 * @param {string} data - The data that is created.
 */
function submit (eui, data) {
  request.post({
    url: api + eui + '/measurement',
    method: 'POST',
    json: true,
    headers: {
      'content-type': 'application/json'
    },
    body: {
      // THE sensor_id IS CURRENTLY HARDCODED BECAUSE MISTAKES WERE MADE.
      // sensor_id is required to pass a value to the API.
      sensor_id: 1,
      value: data
    }
  },
  function (error, response, body) {
    if (!error && response.statusCode === 201) {
      console.log(data);
    }
  });
}

/**
 * Sends an e-mail
 * @function
 * @param {array} mailOptions - Where to send the e-mail, and other settings.
 */
function mail (subject, data) {
  transporter.sendMail({
    from: '"' + mailSenderName + '" <' + mailSenderAddress + '>',
    to: mailReceivers,
    subject: subject,
    text: data
  }, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
  });
}

// 82.176.177.68
