from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.conf import settings
from django.shortcuts import redirect
from django.contrib import messages
from django.contrib.auth.models import User
from .models import Farmer, UserProfile


class DairixAccountAdapter(DefaultAccountAdapter):
    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=False)
        if commit:
            user.save()
        return user


class DairixSocialAccountAdapter(DefaultSocialAccountAdapter):

    def pre_social_login(self, request, sociallogin):
        """
        Block Google login for emails not registered in the system.
        Allows:
          - Existing auth_user emails
          - ADMIN_EMAILS / STAFF_EMAILS from settings
          - Emails pre-registered in dairy_farmer table (gmail field)
        """
        email = ''
        if sociallogin.account.extra_data:
            email = sociallogin.account.extra_data.get('email', '')

        if not email:
            messages.error(request, "Could not retrieve email from Google.")
            raise ImmediateHttpResponse(redirect('login'))

        # Allow if Django user already exists with this email
        if User.objects.filter(email=email).exists():
            return

        # Allow admin/staff emails from settings
        admin_emails = getattr(settings, 'ADMIN_EMAILS', [])
        staff_emails = getattr(settings, 'STAFF_EMAILS', [])
        if email in admin_emails or email in staff_emails:
            return

        # Allow if email is pre-registered in Farmer table by admin
        if Farmer.objects.filter(gmail=email).exists():
            return

        # Block everyone else
        messages.error(
            request,
            f"Access denied. '{email}' is not registered in this system. "
            "Please contact your administrator."
        )
        raise ImmediateHttpResponse(redirect('login'))

    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)

        email = user.email or ''
        admin_emails = getattr(settings, 'ADMIN_EMAILS', [])
        staff_emails = getattr(settings, 'STAFF_EMAILS', [])

        if email in admin_emails:
            role = 'admin'
        elif email in staff_emails:
            role = 'staff'
        else:
            role = 'farmer'

        profile, created = UserProfile.objects.get_or_create(user=user)
        if created or not profile.role:
            profile.role = role
            profile.save()

        if role == 'farmer':
            farmer, created = Farmer.objects.get_or_create(
                gmail=email,
                defaults={
                    'user':    user,
                    'name':    user.get_full_name() or user.username,
                    'phone':   '0000000000',
                    'address': '',
                }
            )
            # Link existing farmer record to new Django user if not linked yet
            if not created and farmer.user is None:
                farmer.user = user
                farmer.save()

        return user