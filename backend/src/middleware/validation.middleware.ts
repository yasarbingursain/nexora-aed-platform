import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Request body contains invalid data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        });
      }
      
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Validation processing failed'
      });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Query validation failed',
          message: 'Query parameters contain invalid data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        });
      }
      
      console.error('Query validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Query validation processing failed'
      });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Parameter validation failed',
          message: 'URL parameters contain invalid data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        });
      }
      
      console.error('Parameter validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Parameter validation processing failed'
      });
    }
  };
};
