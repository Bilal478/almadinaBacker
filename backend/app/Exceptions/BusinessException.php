<?php

namespace App\Exceptions;

use Exception;

/**
 * A business-rule failure (insufficient stock, duplicate SKU, etc.) — as opposed to a
 * validation error or a genuine server fault. Carries a stable `code` string the frontend
 * can branch on (e.g. "INSUFFICIENT_STOCK") without parsing the human-readable message.
 *
 * Note: the property is named $errorCode, not $code — Exception already declares an
 * untyped native $code (numeric), and redeclaring it with a `string` type in a subclass
 * is a fatal error in PHP.
 */
class BusinessException extends Exception
{
    public function __construct(string $message, protected string $errorCode = 'BUSINESS_RULE_FAILED', protected int $status = 422)
    {
        parent::__construct($message);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function status(): int
    {
        return $this->status;
    }
}
