<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseRequest;
use App\Models\Expense;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('manage_expenses');

        $query = Expense::with(['category', 'createdBy'])->where('status', 'active');
        if ($request->filled('date_from')) {
            $query->where('expense_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('expense_date', '<=', $request->date_to);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        return $this->success($query->latest('expense_date')->paginate($request->integer('per_page', 500)));
    }

    public function show(Expense $expense)
    {
        $this->authorize('manage_expenses');
        return $this->success($expense->load(['category', 'createdBy']));
    }

    public function store(StoreExpenseRequest $request)
    {
        $this->authorize('manage_expenses');
        $expense = Expense::create($request->validated() + ['status' => 'active', 'created_by' => $request->user()->id]);
        AuditLogger::log('created', 'expenses', 'expense', $expense->id, null, $expense->toArray());
        return $this->success($expense->load(['category', 'createdBy']), 'Expense recorded', 201);
    }

    public function update(StoreExpenseRequest $request, Expense $expense)
    {
        $this->authorize('manage_expenses');
        $old = $expense->toArray();
        $expense->update($request->validated());
        AuditLogger::log('updated', 'expenses', 'expense', $expense->id, $old, $expense->fresh()->toArray());
        return $this->success($expense->load(['category', 'createdBy']), 'Expense updated');
    }

    /** Expenses are financial history — voided, never hard-deleted. */
    public function void(Expense $expense)
    {
        $this->authorize('manage_expenses');
        $old = $expense->toArray();
        $expense->update(['status' => 'void']);
        AuditLogger::log('voided', 'expenses', 'expense', $expense->id, $old, $expense->fresh()->toArray());
        return $this->success($expense, 'Expense voided');
    }
}
