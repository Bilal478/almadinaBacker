<?php

use App\Exceptions\BusinessException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // CORS is handled automatically by Laravel's default global middleware stack,
        // configured via config/cors.php (allowed_origins reads FRONTEND_URL from .env).
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // The frontend is API-only — every error response is JSON in the consistent
        // { success, message, code, errors } shape (spec section 49/51), never a Laravel
        // HTML error page, and never a raw internal exception message.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (BusinessException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->errorCode(),
                'errors' => [],
            ], $e->status());
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'code' => 'VALIDATION_ERROR',
                'errors' => $e->errors(),
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required.',
                'code' => 'UNAUTHENTICATED',
                'errors' => [],
            ], 401);
        });

        // Laravel converts AuthorizationException (from $this->authorize()/Gate checks) into
        // an AccessDeniedHttpException internally before render() callbacks run, so both
        // types are handled here — otherwise this falls through to the generic
        // HttpExceptionInterface handler below with the wrong `code`.
        $exceptions->render(function (AuthorizationException|AccessDeniedHttpException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'You do not have permission to perform this action.',
                'code' => 'UNAUTHORIZED',
                'errors' => [],
            ], 403);
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => 'The requested resource was not found.',
                'code' => 'NOT_FOUND',
                'errors' => [],
            ], 404);
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Request failed.',
                'code' => 'HTTP_ERROR',
                'errors' => [],
            ], $e->getStatusCode());
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Something went wrong. Please try again.',
                'code' => 'SERVER_ERROR',
                'errors' => [],
            ], 500);
        });
    })->create();
