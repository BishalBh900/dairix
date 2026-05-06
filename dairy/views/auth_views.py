from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.sessions.models import Session
from django.utils import timezone

from ..models import Farmer, UserProfile
from ..decorators import admin_or_staff_required, farmer_only


def get_role(user):
    try:
        return user.profile.role
    except UserProfile.DoesNotExist:
        role = 'admin' if user.is_superuser else 'staff'
        UserProfile.objects.create(user=user, role=role)
        return role


def flush_user_sessions(user):
    """Delete all active sessions belonging to a specific user."""
    for session in Session.objects.filter(expire_date__gte=timezone.now()):
        data = session.get_decoded()
        if data.get('_auth_user_id') == str(user.id):
            session.delete()


def revoke_google_token(user):
    """Delete stored Google OAuth token so user must re-authenticate via Google."""
    try:
        from allauth.socialaccount.models import SocialToken
        SocialToken.objects.filter(
            account__user=user,
            account__provider='google'
        ).delete()
    except Exception:
        pass


def user_logout(request):
    revoke_google_token(request.user)
    request.session.flush()
    logout(request)
    return redirect('login')


def user_login(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()

        # Allow login with email as well as username
        if '@' in username:
            try:
                username = User.objects.get(email=username).username
            except User.DoesNotExist:
                messages.error(request, "No account found with that email.")
                return render(request, 'dairy/login.html')

        user = authenticate(request, username=username, password=password)
        if user:
            flush_user_sessions(user)
            login(request, user)
            return redirect('home')
        messages.error(request, "Invalid username or password.")
    return render(request, 'dairy/login.html')


def signup_view(request):
    if request.method == 'POST':
        email     = request.POST.get('email', '').strip()
        password  = request.POST.get('password', '')
        confirm   = request.POST.get('confirm_password', '')
        role_code = request.POST.get('role_code', '').strip()
        full_name = request.POST.get('full_name', '').strip()
        phone     = request.POST.get('phone', '').strip()
        address   = request.POST.get('address', '').strip()

        if password != confirm:
            messages.error(request, 'Passwords do not match.')
            return redirect('signup')
        if User.objects.filter(email=email).exists():
            messages.error(request, 'An account with this email already exists.')
            return redirect('signup')

        # Generate a unique username from email prefix
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        role = (
            'admin' if role_code == 'ADMIN999' else
            'staff' if role_code == 'STAFF123' else
            'farmer'
        )

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