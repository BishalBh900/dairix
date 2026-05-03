from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from ..models import Farmer, UserProfile
from ..decorators import admin_or_staff_required, farmer_only


def get_role(user):
    try:
        return user.profile.role
    except UserProfile.DoesNotExist:
        role = 'admin' if user.is_superuser else 'staff'
        UserProfile.objects.create(user=user, role=role)
        return role


def user_logout(request):
    logout(request)
    return redirect('login')


def user_login(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        user = authenticate(request,
                            username=request.POST.get('username'),
                            password=request.POST.get('password'))
        if user:
            login(request, user)
            return redirect('home')
        messages.error(request, "Invalid username or password")
    return render(request, 'dairy/login.html')


def signup_view(request):
    if request.method == 'POST':
        email     = request.POST.get('email')
        password  = request.POST.get('password')
        confirm   = request.POST.get('confirm_password')
        role_code = request.POST.get('role_code', '').strip()
        full_name = request.POST.get('full_name', '').strip()
        phone     = request.POST.get('phone', '').strip()
        address   = request.POST.get('address', '').strip()

        base_username = (email or "").split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        if password != confirm:
            messages.error(request, 'Passwords do not match')
            return redirect('signup')
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email already exists')
            return redirect('signup')

        role = 'admin' if role_code == 'ADMIN999' else 'staff' if role_code == 'STAFF123' else 'farmer'
        user = User.objects.create_user(username=username, email=email, password=password)
        user.first_name = full_name
        user.save()
        UserProfile.objects.create(user=user, role=role)

        if role == 'farmer':
            Farmer.objects.create(
                user    = user,
                name    = full_name or username,
                phone   = phone or '0000000000',
                address = address or '',
                gmail   = email or '',
            )

        messages.success(request, f'Account created as {role.capitalize()}. Please log in.')
        return redirect('login')

    return render(request, 'dairy/signup.html')


@login_required(login_url='login')
def root(request):
    role = get_role(request.user)
    if role == 'farmer':
        return redirect('farmer_dashboard')
    return redirect('dashboard')


@login_required(login_url='login')
def profile_view(request):
    role   = get_role(request.user)
    farmer = None
    if role == 'farmer':
        try:
            farmer = request.user.farmer_profile
        except Farmer.DoesNotExist:
            pass
    return render(request, 'dairy/profile.html', {
        'role':   role,
        'farmer': farmer,
    })
