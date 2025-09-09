const ngrok = require('@ngrok/ngrok');

function ngrokConnect(port) {
  ngrok
    .connect({ addr: port, authtoken_from_env: true })
    .then((listener) =>
      console.log(`Ingress established at: ${listener.url()}`)
    );
}

module.exports = ngrokConnect;
