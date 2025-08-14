import 'dotenv/config';

import express from 'express'; // module js 
import mongoose from 'mongoose';
import { DB_NAME } from './constants.js';
import connectDB from "./db/index.js";
import { app } from './app.js';

const port = process.env.PORT || 3000;

// Database connection and server startup
connectDB()
.then(() => {
    app.listen(port, () => {
        console.log(`Server is running at port : ${port}`);
    });
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
});

// dotenv.config({
//   path: './.env'
// })

// // Database connection and server startup
// ;(async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     console.log("MongoDB connected successfully!");
    
//     app.on("error", (error) => {
//       console.log("ERROR: ", error);
//       throw error;
//     });
    
//     app.listen(port, () => {
//       console.log(`Example app listening on port ${port}`)
//     })
    
//   } catch(error) {
//     console.error("ERROR", error);
//     throw error;
//   }
// })()

app.get('/you', (req, res) => {
  res.send('Hello World!')
})
