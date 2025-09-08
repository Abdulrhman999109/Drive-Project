import type { Request , Response , NextFunction } from "express";
import {HTTP} from "../constants.js"

export function notFound(_req:Request , res:Response , _next:NextFunction){
    res.status(HTTP.NOT_FOUND).json({
        success:false,
        title:"Route not found",
        message:'not Found',
        stackTrace:undefined,
    })
}