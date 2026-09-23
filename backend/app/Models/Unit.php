<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'symbol', 'decimal_allowed', 'status'];

    protected $casts = [
        'decimal_allowed' => 'boolean',
    ];
}
