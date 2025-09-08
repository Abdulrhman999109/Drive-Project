import type { NextFunction , Request , Response } from "express";
import { HTTP } from "../constants.js";

export function errorHandler(err:any , _req:Request , res:Response , _next:NextFunction){
    const StatusCode:number = err?.StatusCode?? err?.status?? (res.statusCode >= 400 ? res.statusCode : HTTP.SERVER_ERROR);

    let title = "Error";
    switch(StatusCode){
    case HTTP.VALIDATION_ERROR:
      title = "Validation Failed";
      break;
    case HTTP.UNAUTHORIZED:
      title = "Unauthorized";
      break;
    case HTTP.FORBIDDEN:
      title = "Forbidden";
      break;
    case HTTP.NOT_FOUND:
      title = "Not Found";
      break;
    case HTTP.SERVER_ERROR:
    default:
      title = "Server Error";
      break;
  }
  
  res.status(StatusCode).json({
    success:false,
    title ,
    message:err?.message ,
    stackTrace:err?.stack
  }) 

  
}