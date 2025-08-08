require('dotenv').config();
const express = require('express');
const app = express();

const line = require('@line/bot-sdk');
// const config = {
//     channelAccessToken: '37iqoo3JRCCH20r625QekTnu7hORdhQA5sfrl5RnGOcZMQpAUfVTuQ4LT3PD8MV7z11yEd8TFCcwa5HCWcxSz1G9uXD+XQKBGEnaCx4QHmqEAZVsu98pdy94cIAX6QvEkL+o4oKqxtEzOTTcP5vStQdB04t89/1O/w1cDnyilFU=',
//     channelSecret: 'd44f8271ef5017ec2ad8fee76e611efc'
// };
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || ""
};

const client = new line.Client(config);

// const port = 3000



app.post('/webhook', line.middleware(config), (req, res) => {
    //console.log(req);
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }
    event.message.text =  "บอทตอบ :"+event.message.text 
    //console.log(event);
    //console.log(event.message);
    //console.log(event.message.text);
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: event.message.text,
    });
}


// Respond with Hello World! on the homepage:
app.get('/', (req, res) => {
  res.send('hello world, Phutiphachr');
});

// app.listen(port, () => {
//     console.log(`Example app listening at http://localhost:${port}`)
// })
app.post('/', function (req, res) {
    res.send('Got a POST request')
})
// Respond to a PUT request to the /user route:
app.put('/user', function (req, res) {
    res.send('Got a PUT request at /user')
})
// Respond to a DELETE request to the /user route:
app.delete('/user', function (req, res) {
    res.send('Got a DELETE request at /user')
})

const PORT = process.env.PORT || 3020;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
