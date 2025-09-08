import express from 'express';

import 'dotenv/config';

import blobRouter from './routes/blobsRoutes.js'
import { notFound } from './middleware/notFoundMiddleware.js';
import { errorHandler } from './middleware/errorHandlerMiddleware.js';


const app = express();

app.use(express.json());

app.get("/" , (req , res) =>{
    res.send("server is running")
})

app.use("/api/blobs" , blobRouter)


app.use(notFound);
app.use(errorHandler);
app.listen(process.env.PORT , ()=>{
    console.log("server running")
})

