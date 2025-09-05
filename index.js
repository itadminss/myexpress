require('dotenv').config();
const express = require('express');

const line = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

 const app = express();
// app.use(express.json());
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
 
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || ""
};

const client = new line.Client(config);
 
 
async function testCont() {
  const { data, error } = await supabase
    .from('messages')  
    .select('*')
    .limit(1);

  if (error) {
    console.error('  connection failed:', error.message);
  } else {
    console.log(' connected successfully!');
  }
}

// เรียกใช้งานฟังก์ชันทันที
testCont();
// const port = 3000


// app.post('/webhook', line.middleware(config), (req, res) => {
 
//     Promise
//         .all(req.body.events.map(handleEvent))
//         .then((result) => res.json(result));
// });


function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }
    // event.message.text =  "บอท บ๊อททท ตอบว่า :"+event.message.text 
    //console.log(event);
    //console.log(event.message);
    console.log(event);
    // return client.replyMessage(event.replyToken, {
    //     type: 'text',
    //     text: event.message.text,
    // });
      // ข้อความที่ผู้ใช้พิมพ์มา
  const userMessage = event.message.text;

  // ข้อความที่ตอบกลับ
  const replyContent = `คุณพิมพ์ว่า: ${userMessage} ใช่ไหม?`;

  return supabase
    .from("messages")
    .insert({
      user_id: event.source.userId,
      message_id: event.message.id,
      type: event.message.type,
      content: userMessage,
      reply_token: event.replyToken,
      reply_content: replyContent,
    })
    .then(({ error }) => {
      if (error) {
        console.error("Error inserting message:", error);
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "เกิดข้อผิดพลาดในการบันทึกข้อความ",
        });
      }
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: replyContent,
      });
    });

}

async function generateCreativeReply(userMessage) {
 
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const result = await model.generateContent([`ตอบกลับผู้ใช้ในเชิงสร้างสรรค์: "${userMessage}"`]);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("❌ Gemini error:", error);
    return "ขออภัยค่ะ ระบบ AI มีปัญหาชั่วคราว 😢 ลองใหม่อีกครั้งนะคะ";
  }
}

// LINE Webhook
app.post("/webhookOld", line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent1));
  res.json(results);
});


// async function handleEvent1(event) {
//   try {
//     if (event.type !== "message" || event.message.type !== "text") {
//       return Promise.resolve(null);
//     }

//     const userMessage = event.message.text;
//     const replyContent = await generateCreativeReply(userMessage);

//     const { error } = await supabase.from("messages").insert({
//       user_id: event.source.userId,
//       message_id: event.message.id,
//       type: event.message.type,
//       content: userMessage,
//       reply_token: event.replyToken,
//       reply_content: replyContent,
//     });

//     if (error) {
//       console.error("❌ Supabase insert error:", error);
//       return client.replyMessage(event.replyToken, {
//         type: "text",
//         text: "เกิดข้อผิดพลาดในการบันทึกข้อความ",
//       });
//     }

//     return client.replyMessage(event.replyToken, {
//       type: "text",
//       text: replyContent,
//     });

//   } catch (err) {
//     console.error("❌ handleEvent1 error:", err);

//     if (event?.replyToken) {
//       return client.replyMessage(event.replyToken, {
//         type: "text",
//         text: "เกิดข้อผิดพลาดบางอย่าง 😢 ลองใหม่อีกครั้งนะ",
//       });
//     }

//     return Promise.resolve(null);
//   }
// }

async function handleEvent1(event) {
  try {
    const userId = event.source.userId;
    const message = event.message;

    // ✅ 1. ข้อความ (Text)
    if (message.type === "text") {
      const userMessage = message.text;
      const replyContent = await generateCreativeReply(userMessage);

      await supabase.from("messages").insert({
        user_id: userId,
        message_id: message.id,
        type: message.type,
        content: userMessage,
        reply_token: event.replyToken,
        reply_content: replyContent,
      });

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: replyContent,
      });
    }

    // ✅ 2. รูปภาพ (Image)
    if (message.type === "image") {
      const stream = await client.getMessageContent(message.id);
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const base64Image = buffer.toString("base64");

      const analysisText = await analyzeImageWithGemini(base64Image);

      await supabase.from("messages").insert({
        user_id: userId,
        message_id: message.id,
        type: message.type,
        content: "image_uploaded",
        reply_token: event.replyToken,
        reply_content: analysisText,
      });

      return client.replyMessage(event.replyToken, [
        {
          type: "text",
          text: "📸 รับรูปภาพเรียบร้อยแล้ว!",
        },
        {
          type: "text",
          text: analysisText,
        },
      ]);
    }

    // ❌ กรณีอื่นๆ ที่ไม่รองรับ
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "ขออภัย ยังไม่รองรับข้อความประเภทนี้ 😅",
    });

  } catch (err) {
    console.error("❌ handleEvent1 error:", err);
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "เกิดข้อผิดพลาดบางอย่าง 😢 ลองใหม่อีกครั้งนะ",
    });
  }
}

async function analyzeImageWithGemini(base64Image) {
  try {
    console.log("🔍 เรียก Gemini Vision...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg", // เปลี่ยนเป็น "image/png" ถ้าใช้ png
        },
      },
      "ภาพนี้คือสัตว์ชนิดใด? ตอบเป็นชื่อสัตว์ภาษาไทย พร้อมคำอธิบายสั้น ๆ",
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("📥 Gemini Vision ตอบ:", text);
    return text;
  } catch (error) {
    console.error("❌ analyzeImageWithGemini error:", error);
    return "วิเคราะห์ภาพไม่สำเร็จ 😢 ลองใหม่อีกครั้งนะ";
  }
}



 
app.get('/', (req, res) => {
  res.send('hello world, Phutiphachr');
});

 
app.post('/', function (req, res) {
    res.send('Got a POST request')
})
 
app.put('/user', function (req, res) {
    res.send('Got a PUT request at /user')
})
 
app.delete('/user', function (req, res) {
    res.send('Got a DELETE request at /user')
})

const PORT = process.env.PORT || 3020;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


 