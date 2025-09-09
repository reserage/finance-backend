const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken:
    'G/HImP4RuZxGs45Mr4XbX4SmXqs5hTa2waGWY7zqNQApi9HxE6ARAwA7KekdXp/oFchhar2QYgjtDGQ/6AS5K7xwcgyHO95Piy5WwetOUt89IIg7ERbdWe768m51XTxrYcN8Ev2rzDr/wk7C5SpAPwdB04t89/1O/w1cDnyilFU=',
  channelSecret: '57a88a1a1bda72aa915d7d0026960179',
});

module.exports = client;
// Get your endpoint online
