import express from 'express';

import 'dotenv/config';

import blobRouter from './routes/blobsRoutes.js'
import { notFound } from './middleware/notFoundMiddleware.js';
import { errorHandler } from './middleware/errorHandlerMiddleware.js';
import verifyJWT from './middleware/verifyJWT.js';


const app = express();

app.use(express.json());

app.use("/v1/blobs" ,verifyJWT, blobRouter)


app.use(notFound);
app.use(errorHandler);

app.listen(process.env.PORT, () => console.log("server is running"));




export default app;