import { NextResponse } from 'next/server';
import { ZodError, type ZodIssue } from 'zod';

/**
 * Standardized API Error Handler
 * Hides internal database errors in production
 */
export function handleError(error: unknown) {
    console.error('API Error:', error);

    if (error instanceof ZodError) {
        return NextResponse.json({
            error: 'Validation failed',
            details: error.issues.map((e: ZodIssue) => ({ path: e.path.join('.'), message: e.message }))
        }, { status: 400 });
    }

    const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : (error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Success helper - returns the data directly to maintain compatibility with existing services
 */
export function handleSuccess<T = unknown>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}
