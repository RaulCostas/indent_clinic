import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        // Enforce CORS headers even on error responses
        const origin = request.headers.origin;
        if (origin) {
            response.header('Access-Control-Allow-Origin', origin);
            response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
            response.header('Access-Control-Allow-Credentials', 'true');
            response.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorLog = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            exception: exception instanceof Error ? {
                message: exception.message,
                stack: exception.stack,
                ...(exception instanceof HttpException ? { response: exception.getResponse() } : {})
            } : exception,
        };

        console.error('GLOBAL_EXCEPTION:', JSON.stringify(errorLog, null, 2));

        let errorMessage: any = exception instanceof Error ? exception.message : 'Internal server error';

        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse() as any;
            if (exceptionResponse.message) {
                errorMessage = exceptionResponse.message;
            }
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: errorMessage,
        });
    }
}
