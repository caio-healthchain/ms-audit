import { Request, Response } from 'express';
import { ApiResponse } from '@/types';

export class BaseController {
  public sendResponse<T>(res: Response, data: T, message: string = 'Success'): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  }

  public sendError(res: Response, message: string, statusCode: number = 500): void {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
  }
}
