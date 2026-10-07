<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseCategoryRequest;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index()
    {
        $this->authorize('manage_expenses');
        return $this->success(ExpenseCategory::withCount('expenses')->orderBy('name')->get());
    }

    public function store(StoreExpenseCategoryRequest $request)
    {
        $this->authorize('manage_expenses');
        $category = ExpenseCategory::create($request->validated() + ['status' => 'active']);
        return $this->success($category->loadCount('expenses'), 'Expense category created', 201);
    }

    public function update(StoreExpenseCategoryRequest $request, ExpenseCategory $expenseCategory)
    {
        $this->authorize('manage_expenses');
        $expenseCategory->update($request->validated());
        return $this->success($expenseCategory->loadCount('expenses'), 'Expense category updated');
    }

    /** Inactive categories stay on old expenses and in reports, but can't be picked for new ones. */
    public function setStatus(Request $request, ExpenseCategory $expenseCategory)
    {
        $this->authorize('manage_expenses');
        $request->validate(['status' => ['required', 'in:active,inactive']]);
        $expenseCategory->update(['status' => $request->status]);
        return $this->success($expenseCategory->loadCount('expenses'), 'Expense category status updated');
    }

    /** Only an unused category can be deleted — deleting a used one would orphan its expenses
     *  (and break expense reports); those get deactivated instead. */
    public function destroy(ExpenseCategory $expenseCategory)
    {
        $this->authorize('manage_expenses');

        $count = $expenseCategory->expenses()->count();
        if ($count > 0) {
            throw new BusinessException(
                "\"{$expenseCategory->name}\" is used by {$count} expense(s) and can't be deleted. Deactivate it instead.",
                'CATEGORY_IN_USE',
                409,
            );
        }

        $expenseCategory->delete();
        return $this->success(null, 'Expense category deleted');
    }
}
