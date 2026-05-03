from functools import wraps
from django.shortcuts import redirect
from django.core.exceptions import PermissionDenied


def admin_or_staff_required(view_func):
    """Only Admin and Staff can access this view. Farmers get 403."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        try:
            if request.user.profile.role in ['admin', 'staff']:
                return view_func(request, *args, **kwargs)
        except AttributeError:
            pass
        raise PermissionDenied
    return wrapper


def admin_only(view_func):
    """Only Admin can access this view."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        try:
            if request.user.profile.role == 'admin':
                return view_func(request, *args, **kwargs)
        except AttributeError:
            pass
        raise PermissionDenied
    return wrapper


def farmer_only(view_func):
    """Only Farmers can access this view."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        try:
            if request.user.profile.role == 'farmer':
                return view_func(request, *args, **kwargs)
        except AttributeError:
            pass
        raise PermissionDenied
    return wrapper


def get_role(request):
    """Helper — safely get role string from request."""
    try:
        return request.user.profile.role
    except AttributeError:
        return None