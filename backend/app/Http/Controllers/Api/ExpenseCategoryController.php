<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseCategoryRequest;
use App\Models\ExpenseCategory;

class ExpenseCategoryController extends Controller
{
    public function index()
    {
        $this->authorize('manage_expenses');
        return $this->success(ExpenseCategory::orderBy('name')->get());
    }

    public function store(StoreExpenseCategoryRequest $request)
    {
        $this->authorize('manage_expenses');
        $category = ExpenseCategory::create($request->validated() + ['status' => 'active']);
        return $this->success($category, 'Expense category created', 201);
    }
}
