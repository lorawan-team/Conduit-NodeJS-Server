'use strict';
var request = require('request');
var mqtt = require('mqtt');

// MQTT settings
var url = 'mqtt://127.0.0.1';
var client = mqtt.connect(url);

// POST request settings
var api = 'https://delta-api.fourfusion.nl/';

/**
 * Connects to all public LoRaWAN transmitters through MQTT.
 */
client.on('connect', function () {
  // If you see 'connected, subscribing' in your terminal, this indicates that the app has started.
  console.log('connected, subscribing');
  client.subscribe('lora/+/up');
});

/**
 * This function reacts when the Gateway receives a MQTT message. It then parses the messages to JSON objects.
 * @function
 * @param {string} topic - The euid of the LoRaWAN device.
 * @param {string} message - The MQTT message that's broadcasted by the LoRaWAN transmitter.
 */
client.on('message', function (topic, message) {
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
});

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
      'content-type': 'applications/json'
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
 * If an error occurs, the application currently quits. This should be a development only thing.
 */
client.on('error', function (error) {
  console.log('mqtt error: ', error);
  process.exit();
});
