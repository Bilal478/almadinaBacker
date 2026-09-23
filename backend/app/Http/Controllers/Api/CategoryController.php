<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return $this->success(Category::orderBy('name')->get());
    }

    public function show(Category $category)
    {
        return $this->success($category);
    }

    public function store(StoreCategoryRequest $request)
    {
        $this->authorize('manage_products');
        $category = Category::create($request->validated() + ['status' => 'active']);
        return $this->success($category, 'Category created', 201);
    }

    public function update(StoreCategoryRequest $request, Category $category)
    {
        $this->authorize('manage_products');
        $category->update($request->validated());
        return $this->success($category, 'Category updated');
    }

    public function setStatus(Request $request, Category $category)
    {
        $this->authorize('manage_products');
        $request->validate(['status' => ['required', 'in:active,inactive']]);
        $category->update(['status' => $request->status]);
        return $this->success($category, 'Category status updated');
    }
}
